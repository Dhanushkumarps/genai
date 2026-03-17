-- Migration to add pgvector and course_chunks table for RAG

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS course_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    content TEXT NOT NULL,
    dense_embedding vector(1536),
    sparse_embedding JSONB,
    source_file TEXT,
    chunk_index INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_chunks_module ON course_chunks(module_id);

-- Hybrid search RPC using Reciprocal Rank Fusion (RRF)
-- Note: Sparse (BM25) matching conceptually requires computing dot products over JSONB.
-- To simplify within Supabase without a dedicated BM25 extension, we will approximate 
-- by doing computing in Deno or a PL/pgSQL dot product. For the sake of this RPC, 
-- we will use a dummy/basic approach or expect the application to do exact BM25 via keywords 
-- using FTS, OR we will compute the sparse dot product manually.
-- This RPC implements a dense cosine similarity + a stubbed/basic JSONB dot product for sparse RRF.

CREATE OR REPLACE FUNCTION sparse_dot_product(vec1 JSONB, vec2 JSONB) RETURNS FLOAT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    key TEXT;
    val FLOAT;
    dot FLOAT := 0;
BEGIN
    FOR key, val IN SELECT * FROM jsonb_each_text(vec1) LOOP
        IF vec2 ? key THEN
            dot := dot + (val * (vec2->>key)::FLOAT);
        END IF;
    END LOOP;
    RETURN dot;
END;
$$;

CREATE OR REPLACE FUNCTION match_course_chunks_hybrid(
    p_module_id TEXT,
    p_dense_query vector(1536),
    p_sparse_query JSONB,
    p_limit INT DEFAULT 10
) RETURNS TABLE (
    id UUID,
    content TEXT,
    dense_score FLOAT,
    sparse_score FLOAT,
    rrf_score FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH dense_ranked AS (
        SELECT 
            c.id,
            c.content,
            1 - (c.dense_embedding <=> p_dense_query) AS dense_score,
            row_number() OVER (ORDER BY 1 - (c.dense_embedding <=> p_dense_query) DESC) AS dense_rank
        FROM course_chunks c
        WHERE c.module_id = p_module_id
        ORDER BY dense_score DESC
        LIMIT p_limit * 2
    ),
    sparse_ranked AS (
        SELECT 
            c.id,
            sparse_dot_product(c.sparse_embedding, p_sparse_query) AS sparse_score,
            row_number() OVER (ORDER BY sparse_dot_product(c.sparse_embedding, p_sparse_query) DESC) AS sparse_rank
        FROM course_chunks c
        WHERE c.module_id = p_module_id
        ORDER BY sparse_score DESC
        LIMIT p_limit * 2
    ),
    combined AS (
        SELECT 
            COALESCE(d.id, s.id) as id,
            COALESCE(d.content, (SELECT content FROM course_chunks WHERE id = s.id)) as content,
            COALESCE(d.dense_score, 0) as dense_score,
            COALESCE(s.sparse_score, 0) as sparse_score,
            -- RRF weights: 60% Dense, 40% Sparse. Constant k=60 is standard.
            (0.6 / (60 + COALESCE(d.dense_rank, 1000))) + (0.4 / (60 + COALESCE(s.sparse_rank, 1000))) as rrf_score
        FROM dense_ranked d
        FULL OUTER JOIN sparse_ranked s ON d.id = s.id
    )
    SELECT combined.id, combined.content, combined.dense_score, combined.sparse_score, combined.rrf_score
    FROM combined
    ORDER BY combined.rrf_score DESC
    LIMIT p_limit;
END;
$$;
