// Browser Vision Edge Function
// Analyzes screenshots using GPT-4 Vision, extracts text (OCR), and provides learning insights

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

interface VisionRequest {
    action: 'analyze' | 'extract_text' | 'explain'
    imageBase64: string // Base64 encoded image
    context?: string   // Additional context (URL, page title)
    question?: string  // Specific question about the image
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const body: VisionRequest = await req.json()
        const { action, imageBase64, context, question } = body

        if (!imageBase64) {
            throw new Error('Image data is required')
        }

        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured')
        }

        console.log(`Processing vision request: ${action}`)

        let systemPrompt = ''
        let userPrompt = ''

        switch (action) {
            case 'extract_text':
                systemPrompt = `You are an OCR expert. Extract ALL visible text from the image exactly as shown.
                Format the text clearly, preserving structure like headings, lists, and paragraphs.
                Return the extracted text in a clean, readable format.`
                userPrompt = 'Extract all text from this image:'
                break

            case 'analyze':
                systemPrompt = `You analyze screenshots BRIEFLY. Give max 3-4 bullet points.

FORMAT (exactly):
• **Type**: [1-2 words]
• **Key Point**: [Main takeaway in one line]
• **Tip**: [One actionable suggestion]

NO paragraphs. NO explanations. Just bullets.`
                userPrompt = context
                    ? `Quick analysis. Context: ${context}`
                    : 'Quick analysis:'
                break

            case 'explain':
                systemPrompt = `You are a helpful learning tutor. The user has selected a specific part of their screen.
                Look at the image and provide a clear, educational explanation of what's shown.
                If it's code, explain what it does step by step.
                If it's documentation, summarize the key points.
                If it's a concept, explain it in simple terms with examples.`
                userPrompt = question
                    ? question
                    : 'Explain what I see in this image:'
                break

            default:
                throw new Error(`Unknown action: ${action}`)
        }

        // Call GPT-4 Vision
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${imageBase64}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3,
            }),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('OpenAI error:', result)
            throw new Error(result.error?.message || 'Failed to analyze image')
        }

        const content = result.choices?.[0]?.message?.content || 'Unable to analyze image'

        return new Response(
            JSON.stringify({
                success: true,
                result: content,
                action,
                tokensUsed: result.usage?.total_tokens
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Vision error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: (error as Error).message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
