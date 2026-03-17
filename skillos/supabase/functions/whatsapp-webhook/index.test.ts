import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { handler } from "./index.ts";

const APP_SECRET = "test_meta_app_secret";

// Mock fetch globally so we don't accidentally send messages
const originalFetch = globalThis.fetch;
function setupFetchMock() {
    globalThis.fetch = async () => {
        return new Response('{"success": true}', { status: 200 });
    };
}
function restoreFetchMock() {
    globalThis.fetch = originalFetch;
}

// Utility to generate HMAC SHA-256 for tests
async function generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const data = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    
    const signatureBytes = new Uint8Array(signatureBuffer);
    const hex = Array.from(signatureBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    return `sha256=${hex}`;
}

const mockMessagePayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
        changes: [{
            value: {
                messages: [{
                    from: '1234567890',
                    type: 'text',
                    text: { body: 'Hello test!' }
                }]
            }
        }]
    }]
});

const unicodeEmojiPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
        changes: [{
            value: {
                messages: [{
                    from: '1234567890',
                    type: 'text',
                    text: { body: 'Hello 🌎! \u2028 Test' } // Contains emojis and weird unicode
                }]
            }
        }]
    }]
});

Deno.test("Validation Test: Valid Signature Returns 200", async () => {
    setupFetchMock();
    Deno.env.set('META_APP_SECRET', APP_SECRET);
    Deno.env.set('WHATSAPP_PHONE_NUMBER_ID', '123');
    Deno.env.set('META_ACCESS_TOKEN', 'test_token');

    try {
        const signature = await generateSignature(mockMessagePayload, APP_SECRET);
        
        const req = new Request("http://localhost:8000/", {
            method: "POST",
            headers: {
                "x-hub-signature-256": signature,
                "content-type": "application/json"
            },
            body: mockMessagePayload,
        });
        
        const res = await handler(req);
        assertEquals(res.status, 200);
    } finally {
        restoreFetchMock();
    }
});

Deno.test("Validation Test: Tampered Payload Returns 403", async () => {
    setupFetchMock();
    Deno.env.set('META_APP_SECRET', APP_SECRET);
    
    try {
        const signature = await generateSignature(mockMessagePayload, APP_SECRET);
        
        // TAMPER THE BODY
        const tamperedPayload = mockMessagePayload.replace('Hello test!', 'Tampered!');
        
        const req = new Request("http://localhost:8000/", {
            method: "POST",
            headers: {
                "x-hub-signature-256": signature, // Old signature
                "content-type": "application/json"
            },
            body: tamperedPayload,
        });
        
        const res = await handler(req);
        assertEquals(res.status, 403);
    } finally {
        restoreFetchMock();
    }
});

Deno.test("Validation Test: Emoji and Unicode Payload Returns 200", async () => {
    setupFetchMock();
    Deno.env.set('META_APP_SECRET', APP_SECRET);
    
    try {
        const signature = await generateSignature(unicodeEmojiPayload, APP_SECRET);
        
        const req = new Request("http://localhost:8000/", {
            method: "POST",
            headers: {
                "x-hub-signature-256": signature,
                "content-type": "application/json"
            },
            body: unicodeEmojiPayload,
        });
        
        const res = await handler(req);
        assertEquals(res.status, 200);
    } finally {
        restoreFetchMock();
    }
});
