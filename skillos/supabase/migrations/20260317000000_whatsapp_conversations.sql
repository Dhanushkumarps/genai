-- Migration to add conversations for WhatsApp Webhook

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    wa_id TEXT NOT NULL,
    messages JSONB DEFAULT '[]',   -- rolling window of last 20 messages
    last_active TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_wa_id ON conversations(wa_id);

-- Create an RPC to safely append messages with a row-level lock
CREATE OR REPLACE FUNCTION process_whatsapp_message(
    p_user_id UUID,
    p_wa_id TEXT,
    p_message JSONB
) RETURNS TABLE (
    conversation_id UUID,
    messages JSONB,
    last_active TIMESTAMPTZ,
    is_expired BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
    v_conversation_id UUID;
    v_last_active TIMESTAMPTZ;
    v_messages JSONB;
    v_is_expired BOOLEAN := FALSE;
BEGIN
    -- Try to find and lock the active conversation
    SELECT id, c.messages, c.last_active 
    INTO v_conversation_id, v_messages, v_last_active
    FROM conversations c
    WHERE wa_id = p_wa_id
    ORDER BY c.last_active DESC 
    LIMIT 1 
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Create new conversation
        INSERT INTO conversations (user_id, wa_id, messages, last_active)
        VALUES (p_user_id, p_wa_id, jsonb_build_array(p_message), NOW())
        RETURNING id, conversations.messages, conversations.last_active 
        INTO v_conversation_id, v_messages, v_last_active;
        v_is_expired := FALSE;
    ELSE
        -- Check if expired (>24 hours)
        IF v_last_active < NOW() - INTERVAL '24 hours' THEN
            v_is_expired := TRUE;
            -- We update last_active to now anyway to track the new attempt?
            -- Or leave it as is. Let's update it.
        END IF;

        -- Append and trim using JSONB functions
        WITH elements AS (
            SELECT value FROM jsonb_array_elements(v_messages || jsonb_build_array(p_message))
        ),
        counted AS (
            SELECT value, row_number() over() as rn FROM elements
        ),
        trimmed AS (
            SELECT jsonb_agg(value ORDER BY rn) as msgs
            FROM counted
            WHERE rn > (SELECT count(*) FROM counted) - 20
        )
        SELECT msgs INTO v_messages FROM trimmed;

        -- We only update the DB if it's NOT expired (so we don't pollute context with rejected msgs)
        -- Or we can append it anyway. The prompt says "On every incoming message... Append the new user message... Update last_active to NOW()".
        UPDATE conversations
        SET messages = COALESCE(v_messages, '[]'::jsonb), last_active = NOW()
        WHERE id = v_conversation_id;
    END IF;

    RETURN QUERY SELECT v_conversation_id, v_messages, v_last_active, v_is_expired;
END;
$$;

-- RPC for appending AI response
CREATE OR REPLACE FUNCTION append_ai_response(
    p_conversation_id UUID,
    p_message JSONB
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_messages JSONB;
BEGIN
    SELECT messages INTO v_messages FROM conversations WHERE id = p_conversation_id FOR UPDATE;
    
    WITH elements AS (
        SELECT value FROM jsonb_array_elements(v_messages || jsonb_build_array(p_message))
    ),
    counted AS (
        SELECT value, row_number() over() as rn FROM elements
    ),
    trimmed AS (
        SELECT jsonb_agg(value ORDER BY rn) as msgs
        FROM counted
        WHERE rn > (SELECT count(*) FROM counted) - 20
    )
    SELECT msgs INTO v_messages FROM trimmed;

    UPDATE conversations
    SET messages = COALESCE(v_messages, '[]'::jsonb)
    WHERE id = p_conversation_id;
END;
$$;
