# SkillOS - Deployment Guide

## Deploy to Render (Free Tier)

### Option 1: One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Manual Setup

1. **Create Render Account**: Go to [render.com](https://render.com)

2. **Create Static Site**:
   - Click **New** → **Static Site**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `skillos` (or your choice)
     - **Root Directory**: `frontend`
     - **Build Command**: `npm ci && npm run build`
     - **Publish Directory**: `dist`

3. **Add Environment Variables**:
   - `VITE_SUPABASE_URL` → Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → Your Supabase anon key

4. **Deploy**: Click **Create Static Site**

---

## Supabase Edge Functions

The backend runs on Supabase Edge Functions. Deploy separately:

```bash
cd supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set BROWSERLESS_API_KEY=your_key

# Deploy all functions
supabase functions deploy
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `OPENAI_API_KEY` | ❌ | For AI chat features |
| `BROWSERLESS_API_KEY` | ❌ | For headless browser (free at browserless.io) |

---

## After Deployment

1. Visit your Render URL
2. Test the app functionality
3. Check Supabase logs for any edge function errors

## Troubleshooting

- **Blank page**: Check browser console for errors, ensure env vars are set
- **API errors**: Verify Supabase edge functions are deployed
- **CORS issues**: Check Supabase function CORS headers
