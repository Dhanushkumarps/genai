# CODEBASE.md — SkillOS (InnovateX HackXIndia 2026)

> **AI Context File** — Read this FIRST before making any changes. This file describes the full architecture, conventions, and patterns used so you can ADD features without recreating existing infrastructure.

---

## 🏗️ Project Overview

**SkillOS** is a cognitive learning OS — an AI-powered productivity and learning platform with a futuristic/cyberpunk UI aesthetic. It helps users track learning, manage tasks, prepare for placements, and monitor cognitive wellness.

**Monorepo structure:**
```
HackXIndia-Hackathon-2026/
├── frontend/          ← Vite + React + TypeScript SPA
├── supabase/
│   ├── functions/     ← Deno Edge Functions (serverless API)
│   └── migrations/    ← PostgreSQL schema migrations
└── .agent/            ← AI agent configuration (do NOT modify)
```

---

## ⚙️ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + TypeScript 5.9 | SPA, no SSR |
| **Build** | Vite 7 | Dev server on port 5173 |
| **Routing** | react-router-dom v6 | Client-side routing |
| **Styling** | Tailwind CSS v3 + custom CSS | Dark theme, glass-system.css |
| **UI Components** | Radix UI primitives | dialog, label, progress, scroll-area, slider, slot |
| **Animations** | Framer Motion + GSAP | Page transitions, micro-interactions |
| **Icons** | lucide-react | Consistent icon set |
| **3D** | Spline (@splinetool/react-spline) | Login page 3D robot |
| **Charts** | D3.js + uPlot | Data visualizations |
| **Toasts** | sonner | `<Toaster richColors position="top-center" />` |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) | BaaS |
| **AI** | OpenAI API (gpt-4o, gpt-4o-mini) | Via Supabase Edge Functions |
| **Testing** | Vitest + Testing Library + jsdom | Unit tests |
| **PDF** | html2canvas + html2pdf.js | Report generation |

---

## 📁 Frontend Architecture

### Path Alias
```typescript
// vite.config.ts — "@/" maps to "./src/"
import { "@/components/ui/card" }  // → src/components/ui/card
```

### Utility Functions
```typescript
// src/lib/utils.ts — cn() for conditional Tailwind classes
import { cn } from "@/lib/utils"
cn("base-class", condition && "conditional-class")
```

### Supabase Client
```typescript
// src/lib/supabase.ts — Typed Supabase client
import { supabase } from "@/lib/supabase"
// Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
```

---

## 🔐 Authentication System

**Provider:** `src/features/auth/AuthContext.tsx`  
**Guard:** `src/features/auth/ProtectedRoute.tsx`  
**Login UI:** `src/features/auth/Login.tsx`

### Auth Methods Available
- `signInWithPassword(email, password)`
- `signUpWithPassword(email, password)`
- `signInWithOTP(phone)` + `verifyOTP(phone, token)`
- `signOut()`

### Usage Pattern
```typescript
import { useAuth } from "@/features/auth/AuthContext"

function MyComponent() {
  const { user, session, loading, signOut } = useAuth()
  // user.id is the Supabase user UUID
}
```

### Auth Flow
1. Unauthenticated → redirected to `/login`
2. After login → redirected to `/` (dashboard) or `/onboarding` (first time)
3. All dashboard routes wrapped in `<ProtectedRoute>`

---

## 🗺️ Routing Map

```
App.tsx (BrowserRouter → AuthProvider → Routes)
├── /login              → LoginPage (public)
├── /onboarding         → OnboardingPage (protected, no layout)
│
└── [DashboardLayout]   (protected, with sidebar + menu bar + dock)
    ├── /               → DashboardPage
    ├── /tasks          → TasksPage
    ├── /placement      → PlacementAgent
    ├── /neural         → NeuralProcessManager
    ├── /dejavu         → DejaVuPanel
    ├── /flow           → FlowOrchestrator
    ├── /skills         → SkillPackageManager
    ├── /firewall       → CognitiveFirewall
    ├── /browser        → LearningBrowser
    ├── /resources      → ResourcesPage
    └── /bridge         → SkillBridgePage
```

### Adding a New Route
1. Create component in `src/features/<feature>/` or `src/pages/`
2. Import in `App.tsx`
3. Add `<Route>` inside the `DashboardLayout` wrapper
4. Add navigation item in `src/components/layout/AppSidebar.tsx`
5. Optionally add to `src/components/layout/OSDock.tsx`

---

## 🧩 Feature Modules

Each feature is a self-contained folder in `src/features/`:

| Module | Path | Description | Files |
|--------|------|-------------|-------|
| **ai** | `features/ai/` | AI chat, sentiment analysis, learning insights | `callAIFunction.ts`, `NeuralChat.tsx`, `AIAgent.tsx`, hooks |
| **auth** | `features/auth/` | Authentication context, login, protected routes | `AuthContext.tsx`, `Login.tsx`, `ProtectedRoute.tsx` |
| **browser** | `features/browser/` | In-app learning browser with AI context panel | `LearningBrowser.tsx`, `ContextPanel.tsx`, hook |
| **dashboard** | `features/dashboard/` | Main dashboard cards and system monitor | `Dashboard.tsx`, `EnergyCard.tsx`, `DeepWorkCard.tsx`, `SystemMonitor.tsx` |
| **firewall** | `features/firewall/` | Cognitive distraction blocker | `CognitiveFirewall.tsx` |
| **flow** | `features/flow/` | Flow state orchestration | `FlowOrchestrator.tsx` |
| **memory** | `features/memory/` | Learning logs, brain dumps, knowledge graph, DejaVu | 13 files including `KnowledgeGraph.tsx`, `BrainDump.tsx` |
| **neural** | `features/neural/` | Neural process monitoring | `NeuralProcessManager.tsx` |
| **placement** | `features/placement/` | AI career coach, mock interviews, skill gap analysis | `PlacementAgent.tsx`, `MockInterview.tsx`, `LearningPlanView.tsx` |
| **resources** | `features/resources/` | Learning resources aggregator | `ResourcesPage.tsx` |
| **safety** | `features/safety/` | Burnout detection, break scheduling, breathing exercises | 9 files including `UptimeMonitor.tsx`, `KernelPanicProtocol.tsx` |
| **skills** | `features/skills/` | Skill package manager | `SkillPackageManager.tsx` |
| **tasks** | `features/tasks/` | Task management with AI advisor | `TaskManager.tsx`, `TaskCard.tsx`, `AddTaskModal.tsx`, hooks |

### Feature Module Pattern
```
features/<name>/
├── <Name>.tsx              ← Main component (page-level)
├── <SubComponent>.tsx      ← Child components
├── use<Hook>.ts            ← Custom hooks (data fetching, state)
└── index.ts                ← Optional barrel export
```

---

## 🎨 UI Components

### Shared UI (`src/components/ui/`)

| Component | File | Description |
|-----------|------|-------------|
| Badge | `badge.tsx` | Status labels |
| Button | `button.tsx` | CVA-based button variants |
| Card | `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent |
| Dialog | `dialog.tsx` | Modal dialogs (Radix) |
| Input | `input.tsx` | Text inputs |
| Label | `label.tsx` | Form labels (Radix) |
| MacWindow | `MacWindow.tsx` | macOS-style window chrome wrapper |
| Progress | `progress.tsx` | Progress bars (Radix) |
| ScrollArea | `scroll-area.tsx` | Scrollable containers (Radix) |
| Sidebar | `sidebar.tsx` | Collapsible sidebar |
| Slider | `slider.tsx` | Range sliders (Radix) |
| Tabs | `tabs.tsx` | Tab navigation |
| Textarea | `textarea.tsx` | Text areas |

**Decorative/Animation components:** `auth-background.tsx`, `pixel-canvas.tsx`, `spiral-animation.tsx`, `splite.tsx` (Spline 3D), `spotlight.tsx`

### Layout (`src/components/layout/`)

| Component | Description |
|-----------|-------------|
| `DashboardLayout.tsx` | Main app shell with sidebar + menu bar + dock |
| `AppSidebar.tsx` | Navigation sidebar with all route links |
| `MacMenuBar.tsx` | Top menu bar (macOS-style) |
| `OSDock.tsx` | Bottom dock bar |

### Component Convention (shadcn/ui pattern)
```typescript
// All UI components use:
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

// Forwarded refs, composable, variant-based
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(...)
```

---

## 🎨 Styling System

### Design Tokens (CSS Variables)
Defined in `src/styles/index.css` via HSL CSS variables:
```css
--background, --foreground, --primary, --secondary, --muted,
--accent, --destructive, --card, --popover, --border, --input,
--ring, --success, --warning, --radius
```

### Glass Design System
`src/styles/glass-system.css` — Custom glass/frosted-glass effects for the cyberpunk aesthetic.

### Tailwind Config
- **Dark mode:** class-based (`darkMode: ["class"]`)
- **Custom animations:** `glitch`, `shine`, `spotlight`, accordion
- **Plugin:** `tailwindcss-animate`
- **Colors:** All use CSS variable references (`hsl(var(--primary))`)

### Theme: Dark cyberpunk / OS-like
- Dark backgrounds with glassmorphism
- Gold/amber accent colors
- Monospace elements for "terminal" feel
- 3D elements via Spline

---

## 🗄️ Database Schema (14 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User profiles | `id`, `phone`, `full_name` |
| `tasks` | Task management | `user_id`, `title`, `status`, `priority`, `difficulty` |
| `learning_logs` | Learning journal entries | `user_id`, `content`, `tags`, `embedding` |
| `system_stats` | Cognitive load tracking | `user_id`, `cognitive_load`, `energy_level` |
| `brain_dumps` | Stress/thought dumps | `user_id`, `content`, `type` |
| `placement_profiles` | Career target profiles | `target_role`, `current_skills`, `skill_gaps` |
| `learning_plans` | Study plans | `profile_id`, `daily_plan`, `resources` |
| `mock_interviews` | Interview practice sessions | `profile_id`, `questions`, `overall_score` |
| `skill_progress` | Skill level tracking | `skill_name`, `current_level`, `target_level` |
| `browsing_sessions` | Learning browser sessions | `pages_visited`, `notes_created` |
| `smart_notes` | AI-extracted notes | `title`, `content`, `sources` |
| `break_logs` | Break/wellness tracking | `break_type`, `duration_seconds` |
| `panic_events` | Burnout/panic events | `type`, `severity`, `resolved` |

### RPC Functions
- `match_learning_logs(query_embedding, match_threshold, match_count)` — Vector similarity search

### Types
All types are in `src/types/supabase.ts` (auto-generated Supabase types).

---

## ☁️ Supabase Edge Functions (21 Functions)

Edge functions run on Deno and are deployed to `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `ai-complete` | General AI (chat, summarize, sentiment, recommend, insights) |
| `ai-agent` | AI agent operations |
| `placement-agent-v2` | Career analysis, interviews, flashcards (main version) |
| `placement-agent` | Legacy placement agent |
| `analyze-connections` | Knowledge connection analysis |
| `analyze-gap` | Skill gap analysis |
| `analyze-role` | Role market analysis |
| `browser-assistant` | AI browsing assistant |
| `browser-proxy` | Web content proxy |
| `browser-vision` | Page analysis |
| `calc-system-stats` | Calculate cognitive stats |
| `cognitive-firewall` | Distraction blocking logic |
| `deja-vu-engine` | Memory recall / spaced repetition |
| `flow-orchestrator` | Flow state management |
| `generate-embedding` | Text → vector embeddings |
| `neural-process-manager` | Neural process logic |
| `skill-gap` | Skill gap calculation |
| `skill-package-manager` | Skill management |
| `skill-profiler` | Skill profiling |
| `update-system-stats` | Update cognitive metrics |

### Edge Function Pattern
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
    // ... logic
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Calling Edge Functions from Frontend
```typescript
import { supabase } from "@/lib/supabase"

// Option A: Direct fetch (used in callAIFunction.ts)
const response = await fetch(`${SUPABASE_URL}/functions/v1/<function-name>`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'apikey': SUPABASE_ANON_KEY,
  },
  body: JSON.stringify(payload),
})

// Option B: Supabase client invoke
const { data, error } = await supabase.functions.invoke('<function-name>', {
  body: payload,
})
```

---

## 🔑 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co      # Required
VITE_SUPABASE_ANON_KEY=eyJ...                    # Required
OPENAI_API_KEY=sk-...                            # NOT used by frontend directly
```

### Supabase Secrets (for Edge Functions)
```bash
# Set via CLI — these are server-side only
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

> **IMPORTANT:** Edge functions read secrets via `Deno.env.get('KEY')`. The frontend `.env` does NOT supply these.

---

## 📋 How to Add a New Feature

### 1. New Page/Route
```
1. Create: src/features/<feature>/<FeatureName>.tsx
2. Add route: src/App.tsx → <Route path="/<feature>" element={<FeatureName />} />
3. Add nav: src/components/layout/AppSidebar.tsx
4. Optionally add dock icon: src/components/layout/OSDock.tsx
```

### 2. New UI Component
```
1. Create: src/components/ui/<component>.tsx
2. Use cn() for classes, forwardRef for DOM access
3. Follow shadcn/ui pattern (see existing button.tsx, card.tsx)
```

### 3. New Custom Hook
```
1. Create: src/features/<feature>/use<HookName>.ts
2. Use supabase client for data: import { supabase } from "@/lib/supabase"
3. Use useAuth() for user context: import { useAuth } from "@/features/auth/AuthContext"
```

### 4. New Edge Function
```
1. Create: supabase/functions/<function-name>/index.ts
2. Follow the CORS + serve pattern (see ai-complete/index.ts)
3. Access OpenAI via Deno.env.get('OPENAI_API_KEY')
4. Deploy: npx supabase functions deploy <function-name>
```

### 5. New Database Table
```
1. Create migration: supabase/migrations/<timestamp>_<name>.sql
2. Update types: src/types/supabase.ts (add Row/Insert/Update types)
3. Apply: npx supabase db push
```

---

## 🧪 Testing

```bash
cd frontend
npm test          # Run vitest
npm run lint      # Run ESLint
npm run build     # TypeScript + Vite build check
```

- Tests in: `src/__tests__/` and `src/test/`
- Config: `vitest` in `vite.config.ts` with jsdom environment

---

## 🚀 Dev Commands

```bash
cd frontend
npm install       # Install dependencies
npm run dev       # Start dev server (port 5173)
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests
```

---

## ⚠️ Known Constraints

1. **No SSR** — Pure client-side SPA
2. **Supabase-only backend** — No custom server, all logic in Edge Functions
3. **OpenAI key is server-side** — Must be set as Supabase secret, NOT in frontend .env
4. **Tailwind v3** — Not v4, uses `tailwind.config.ts` + PostCSS
5. **React 19** — Uses latest React features
6. **Dark theme only** — No light mode toggle
7. **Large bundles** — Spline (2MB), html2pdf (975KB) are chunked but heavy

---

## 📦 Key Dependencies to Know

| Package | Purpose | Import |
|---------|---------|--------|
| `@supabase/supabase-js` | Database + Auth + Functions | `import { supabase } from "@/lib/supabase"` |
| `framer-motion` | Animations | `import { motion, AnimatePresence } from "framer-motion"` |
| `lucide-react` | Icons | `import { IconName } from "lucide-react"` |
| `sonner` | Toast notifications | `import { toast } from "sonner"` |
| `class-variance-authority` | Component variants | `import { cva } from "class-variance-authority"` |
| `clsx` + `tailwind-merge` | Class merging | Via `cn()` from `@/lib/utils` |
| `date-fns` | Date formatting | `import { format } from "date-fns"` |
| `d3` | Data visualization | Used in KnowledgeGraph, SystemMonitor |
| `gsap` | Advanced animations | Used in specific components |
| `canvas-confetti` | Celebration effects | Used on task completion |

---

## 📂 File Dependencies Map

| If you change... | Also check/update... |
|------------------|---------------------|
| `src/lib/supabase.ts` | Every feature that imports it |
| `src/types/supabase.ts` | All DB-interacting components |
| `src/features/auth/AuthContext.tsx` | `useAuth()` consumers everywhere |
| `src/App.tsx` | All page imports, routing |
| `src/components/layout/DashboardLayout.tsx` | Sidebar, MenuBar, Dock |
| `src/components/layout/AppSidebar.tsx` | Navigation items |
| `src/styles/index.css` | CSS variable consumers (Tailwind theme) |
| `src/styles/glass-system.css` | All glass-styled components |
| `tailwind.config.ts` | All Tailwind class usage |
| `.env` | Supabase client initialization |
