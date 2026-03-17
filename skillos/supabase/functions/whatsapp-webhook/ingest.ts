import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Part A: Data Ingestion Script (Run once per content update)
// Run this with Deno: `deno run --allow-env --allow-net --allow-read ingest.ts`

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// Basic Text Splitter (512 tokens ~ 2000 chars, 50 overlap ~ 200 chars)
function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}

// Simple BM25 sparse vector builder (frequency map of words)
function generateSparseEmbedding(text: string): Record<string, number> {
    const words = text.toLowerCase().match(/\b(\w+)\b/g);
    if (!words) return {};
    
    const sparse: Record<string, number> = {};
    for (const word of words) {
        if (!sparse[word]) sparse[word] = 0;
        sparse[word] += 1;
    }
    return sparse;
}

// Generate dense embedding via text-embedding-3-small
async function generateDenseEmbedding(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text,
            dimensions: 1536
        })
    });
    
    const data = await res.json();
    return data.data[0].embedding;
}

export async function processDocument(moduleId: string, contentStr: string, sourceFile: string) {
    console.log(`Processing document for module: ${moduleId}`);
    
    const chunks = chunkText(contentStr);
    console.log(`Created ${chunks.length} chunks.`);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        
        // Ensure OpenAI is called for Dense
        const dense = await generateDenseEmbedding(chunkText);
        
        // Generate Sparse locally
        const sparse = generateSparseEmbedding(chunkText);
        
        const { error } = await supabase.from('course_chunks').insert({
            module_id: moduleId,
            content: chunkText,
            dense_embedding: dense,
            sparse_embedding: sparse,
            source_file: sourceFile,
            chunk_index: i
        });
        
        if (error) {
            console.error(`Error inserting chunk ${i}:`, error);
        } else {
            console.log(`Successfully ingested chunk ${i}/${chunks.length}`);
        }
    }
}

// Example usage
if (import.meta.main) {
    const sampleText = "Welcome to module CS101. A linked list is a linear data structure, in which the elements are not stored at contiguous memory locations. The elements in a linked list are linked using pointers as shown in the below image. In simple words, a linked list consists of nodes where each node contains a data field and a reference(link) to the next node in the list.";
    await processDocument("CS101", sampleText, "cs101_chapter1.txt");
}
