-- Migration to track internal Web App API tools calls made by the LLM agent

CREATE TABLE IF NOT EXISTS api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name TEXT NOT NULL,
    user_id UUID NOT NULL,
    request_payload JSONB,
    response_status INT,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_calls_user_id ON api_calls(user_id);
