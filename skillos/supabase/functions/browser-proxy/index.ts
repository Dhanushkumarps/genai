// Browser Proxy Edge Function with Browserless.io + ScrapingBee
// Renders JS-heavy pages using headless browser APIs
// Browserless.io FREE: 6 hours/month - Get key at https://browserless.io

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API Keys (set in Supabase secrets)
const BROWSERLESS_API_KEY = Deno.env.get('BROWSERLESS_API_KEY') || ''
const SCRAPINGBEE_API_KEY = Deno.env.get('SCRAPINGBEE_API_KEY') || ''

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()

        if (!url) {
            throw new Error('URL is required')
        }

        console.log('Rendering page:', url)

        let html = ''
        let method = 'direct'

        // Priority 1: Browserless.io (FREE TIER - 6 hours/month)
        // Get your free key at: https://browserless.io
        if (BROWSERLESS_API_KEY && !html) {
            try {
                console.log('Trying Browserless.io...')

                const response = await fetch(`https://chrome.browserless.io/content?token=${BROWSERLESS_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        waitFor: 3000,
                        gotoOptions: {
                            waitUntil: 'networkidle2',
                            timeout: 30000
                        }
                    })
                })

                if (response.ok) {
                    html = await response.text()
                    method = 'browserless'
                    console.log('Browserless success! HTML length:', html.length)
                } else {
                    const errorText = await response.text()
                    console.log('Browserless error:', response.status, errorText)
                }
            } catch (e) {
                console.error('Browserless failed:', e)
            }
        }

        // Priority 2: ScrapingBee (paid backup)
        if (SCRAPINGBEE_API_KEY && !html) {
            try {
                console.log('Trying ScrapingBee...')
                const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/')
                scrapingBeeUrl.searchParams.set('api_key', SCRAPINGBEE_API_KEY)
                scrapingBeeUrl.searchParams.set('url', url)
                scrapingBeeUrl.searchParams.set('render_js', 'true')
                scrapingBeeUrl.searchParams.set('wait', '3000')
                scrapingBeeUrl.searchParams.set('wait_browser', 'networkidle2')
                scrapingBeeUrl.searchParams.set('block_ads', 'true')

                const response = await fetch(scrapingBeeUrl.toString(), {
                    method: 'GET',
                    headers: { 'Accept': 'text/html' }
                })

                if (response.ok) {
                    html = await response.text()
                    method = 'scrapingbee'
                    console.log('ScrapingBee success! HTML length:', html.length)
                }
            } catch (e) {
                console.error('ScrapingBee failed:', e)
            }
        }

        // Priority 3: Direct fetch (for simple sites)
        if (!html) {
            try {
                console.log('Trying direct fetch...')
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                    },
                    redirect: 'follow',
                })

                if (response.ok) {
                    html = await response.text()
                    method = 'direct'
                    console.log('Direct fetch success! HTML length:', html.length)
                }
            } catch (e) {
                console.error('Direct fetch failed:', e)
            }
        }

        if (!html) {
            throw new Error('Failed to fetch page. Add BROWSERLESS_API_KEY for full site support (free at browserless.io)')
        }

        // Process HTML for embedding
        const baseUrl = new URL(url)
        const baseHref = `${baseUrl.protocol}//${baseUrl.host}`

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        const title = titleMatch?.[1]?.trim() || baseUrl.hostname

        // Inject base tag
        if (!html.includes('<base')) {
            html = html.replace(/<head[^>]*>/i, `$&\n<base href="${baseHref}/" target="_self">`)
        }

        // Remove security headers blocking embedding
        html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
        html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '')

        // Fix relative URLs
        html = html.replace(/src=["']\/(?!\/)/g, `src="${baseHref}/`)
        html = html.replace(/href=["']\/(?!\/)/g, `href="${baseHref}/`)
        html = html.replace(/srcset=["']\/(?!\/)/g, `srcset="${baseHref}/`)

        // Strip scripts (content already rendered by headless browser)
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        html = html.replace(/<script[^>]*\/>/gi, '')

        // Inject display styles
        const customStyles = `
      <style id="skillbrowser-styles">
        html, body { max-width: 100% !important; overflow-x: hidden !important; margin: 0 !important; }
        img, video, iframe { max-width: 100% !important; height: auto !important; }
        * { box-sizing: border-box !important; }
      </style>
    `
        html = html.replace('</head>', customStyles + '\n</head>')

        return new Response(
            JSON.stringify({
                success: true,
                html,
                title,
                baseUrl: baseHref,
                method,
                length: html.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Proxy error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: (error as Error).message,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
