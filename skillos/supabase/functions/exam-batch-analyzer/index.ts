import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { files, driveLink } = await req.json()

        if ((!files || files.length === 0) && !driveLink) {
            throw new Error('Please provide files or a Google Drive link.')
        }

        let imagesToProcess: any[] = []

        // 1. Handle direct file uploads (array of base64 strings)
        if (files && files.length > 0) {
            imagesToProcess = files.map((base64: string) => ({
                type: 'image_url' as const,
                image_url: { url: base64, detail: 'high' as const }
            }))
        }
        
        // 2. Handle Google Drive Link (MVP approach - warns users it needs to be public direct files)
        // Since downloading an entire Google Drive folder structure programmatically without oauth is extremely hard,
        // we will assume the user provides a direct link to a PDF, or we just rely on direct uploads for now.
        if (driveLink && imagesToProcess.length === 0) {
            throw new Error("Google Drive parsing is currently limited. Please upload the PDF files directly.")
        }

        const SYSTEM_PROMPT = `You are an expert AI teaching assistant specialized in Visvesvaraya Technological University (VTU) Karnataka engineering exams.

You will be provided with images of ONE OR MORE exam papers (potentially multiple subjects, multiple years, or multiple pages of the same paper).

Your Goal: 
Cross-reference all provided questions across all papers, aggregate them, and determine their IMPORTANCE based on how frequently they appear. 
Sort the questions by VTU Module (Module 1 to Module 5), and within each module, sort by Importance (from highest frequency/importance to lowest).

Instructions:
1. Extract top-level metadata: Subject Codes and Course Names detected across all papers.
2. Extract EVERY question from EVERY page.
3. Group identical or highly similar questions together. If a question appears across 3 different papers, its frequency is 3. Note down the maximum marks it usually carries.
4. Categorize the grouped question into its relevant VTU Syllabus Module (Module 1 through Module 5).
5. Generate a detailed, highly accurate University-level Model Answer for each categorized question.
6. Provide an "importanceScore" from 1 to 10 (10 being most repeated/critical).

Return strictly this JSON structure:
{
  "subjectCode": "String (Combined code if multiple)",
  "courseName": "String (The primary subject name)",
  "detectedSubjects": ["Subject 1", "Subject 2"],
  "modules": [
    {
      "moduleName": "Module 1",
      "questions": [
        {
          "frequency": Number (how many times it appeared),
          "importanceScore": Number (1-10),
          "marks": Number (usual marks),
          "text": "The aggregated question text",
          "modelAnswer": "Detailed markdown model answer",
          "bloomsTaxonomy": "String (e.g., L2 - Understand)"
        }
      ]
    }
  ]
}
Ensure questions within each module are sorted by importanceScore descending. Return ONLY JSON.`

        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY environment variable is not set.')

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                temperature: 0.2,
                max_tokens: 16384,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze these exam papers, aggregate the questions, and generate the Important Question Bank.' },
                            ...imagesToProcess
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error?.message || 'Failed to call OpenAI')
        }

        const data = await response.json()
        const rawJson = data.choices[0]?.message?.content ?? ''
        const result = JSON.parse(rawJson.replace(/```json\n?|```/g, '').trim())

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
