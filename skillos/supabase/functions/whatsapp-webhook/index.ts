import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const url = new URL(req.url);

    try {
        // ==========================================
        // 1. GET Request: Meta Webhook Verification
        // ==========================================
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

            if (mode === 'subscribe' && token === verifyToken) {
                console.log('Webhook verified successfully!');
                return new Response(challenge, { status: 200 });
            } else {
                console.error('Webhook verification failed.');
                return new Response('Forbidden', { status: 403 });
            }
        }

        // ==========================================
        // 2. POST Request: Handle Incoming Messages
        // ==========================================
        if (req.method === 'POST') {
            const body = await req.json();
            console.log('Received webhook payload:', JSON.stringify(body, null, 2));

            // Check if the payload is from WhatsApp Business Account
            if (body.object === 'whatsapp_business_account') {

                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;

                // IMPORTANT: Filter out status updates (delivery/read receipts)
                // We only want to process actual messages
                if (value?.messages && value.messages.length > 0) {
                    const message = value.messages[0];
                    const senderWaId = message.from; // Sender's phone number
                    
                    let messageBody = '';
                     // Extract text message
                    if (message.type === 'text') {
                        messageBody = message.text.body;
                    } else {
                        // Handle other types like audio, image, etc. here if needed
                        console.log(`Received non-text message type: ${message.type}`);
                        return new Response('OK', { status: 200, headers: corsHeaders });
                    }

                    console.log(`Received message from ${senderWaId}: ${messageBody}`);

                    // ==========================================
                    // 3. Send Reply via Meta Cloud API
                    // ==========================================
                    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
                    const accessToken = Deno.env.get('META_ACCESS_TOKEN');

                    if (!phoneNumberId || !accessToken) {
                        console.error('Missing required environment variables for sending message.');
                        return new Response('Server Configuration Error', { status: 500, headers: corsHeaders });
                    }

                    // Send the hardcoded reply
                    const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: senderWaId,
                            type: 'text',
                            text: { 
                                body: 'Hello, I received your message!' 
                            }
                        })
                    });

                    if (!metaResponse.ok) {
                        const errorData = await metaResponse.text();
                        console.error('Failed to send message via Meta API:', errorData);
                    } else {
                        console.log(`Reply sent successfully to ${senderWaId}`);
                    }
                } else {
                    // This is likely a status update (sent, delivered, read)
                    console.log('Received status update or non-message event. Ignoring.');
                }
            } else {
                 console.log(`Received unknown object type: ${body.object}`);
                 return new Response('Not Found', { status: 404, headers: corsHeaders });
            }

            // Always return a 200 OK to Meta to acknowledge receipt
            return new Response('OK', { status: 200, headers: corsHeaders });
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        
    } catch (error) {
        console.error('Error processing webhook:', error);
        // Meta expects a 200 OK even if we error internally so it stops retrying the webhook
        return new Response('Error processing request', { status: 200, headers: corsHeaders });
    }
});
