-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a function to search for learning logs (RPC)
create or replace function match_learning_logs (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    learning_logs.id,
    learning_logs.content,
    1 - (learning_logs.embedding <=> query_embedding) as similarity
  from learning_logs
  where 1 - (learning_logs.embedding <=> query_embedding) > match_threshold
  order by learning_logs.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an HNSW index for faster similarity search
-- Note: You might need to drop this if you have very little data (less than 2000 rows) as it builds a graph, but it's good practice.
create index if not exists learning_logs_embedding_idx 
on learning_logs 
using hnsw (embedding vector_cosine_ops);
