# ARCHITECTURE.md — SkillOS System Architecture

> Visual architecture reference for the SkillOS platform.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React)               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Auth     │  │ Dashboard│  │ Features │  │ UI      │ │
│  │ Context  │  │ Layout   │  │ Modules  │  │ Comps   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┘ │
│       │              │             │                     │
│       └──────────────┴─────────────┘                     │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │ Supabase      │                           │
│              │ Client (JS)   │                           │
│              └───────┬───────┘                           │
└──────────────────────┼───────────────────────────────────┘
                       │ HTTPS
┌──────────────────────┼───────────────────────────────────┐
│                SUPABASE CLOUD                            │
│                      │                                   │
│  ┌───────────────────┼───────────────────────────────┐   │
│  │           Edge Functions (Deno)                    │   │
│  │                                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ ai-complete  │  │ placement-   │  ... 19 more  │   │
│  │  │ (OpenAI)     │  │ agent-v2     │               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  └───────────────────────────────────────────────────┘   │
│                      │                                   │
│  ┌───────────────────┼───────────────────────────────┐   │
│  │           PostgreSQL Database                      │   │
│  │                                                    │   │
│  │  users, tasks, learning_logs, system_stats,        │   │
│  │  brain_dumps, placement_profiles, learning_plans,  │   │
│  │  mock_interviews, skill_progress, smart_notes,     │   │
│  │  browsing_sessions, break_logs, panic_events       │   │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │           Auth (Email/Password/OTP)                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  OPENAI API                              │
│  Models: gpt-4o, gpt-4o-mini, tts-1, whisper-1          │
└──────────────────────────────────────────────────────────┘
```

---

## Frontend Module Dependency Graph

```
App.tsx
├── AuthProvider (context)
│   └── useAuth() → consumed by ALL protected components
│
├── DashboardLayout
│   ├── AppSidebar (navigation)
│   ├── MacMenuBar (top bar)
│   └── OSDock (bottom dock)
│
└── Pages/Features
    ├── DashboardPage
    │   ├── Dashboard → SystemMonitor, EnergyCard, DeepWorkCard
    │   └── useRealtimeStats, useActivityTracker
    │
    ├── TasksPage → TaskManager → TaskCard, AddTaskModal
    │   └── useTaskOperations, useTaskAdvisor (AI)
    │
    ├── PlacementAgent (self-contained mega-component)
    │   ├── MockInterview, LearningPlanView
    │   └── usePlacementAgent
    │
    ├── Memory features
    │   ├── DejaVuPanel → useVectorSearch
    │   ├── LearningLog → LogEntry, LogTimeline
    │   ├── BrainDump → useBrainDumpDetector, useVoiceInput
    │   └── KnowledgeGraph (D3)
    │
    ├── Safety features
    │   ├── UptimeMonitor → useBurnoutDetection
    │   ├── BreakNotification → useBreakScheduler
    │   ├── BreathingExercise
    │   └── KernelPanicProtocol, SafeModeScreen
    │
    └── AI features
        ├── NeuralChat → useAIChat → callAIFunction
        ├── AIAgent → useARIACommands
        └── useSentimentAnalysis, useLearningInsights
```

---

## Data Flow Patterns

### Pattern 1: Direct Supabase Query (most common)
```
Component → supabase.from('table').select() → Render
```

### Pattern 2: AI via Edge Function
```
Component → callAIFunction() → fetch(edge-function) → OpenAI → Response
```

### Pattern 3: Real-time Subscription
```
Component → supabase.channel().on('postgres_changes') → State Update → Re-render
```

### Pattern 4: Auth-gated Data
```
useAuth() → user.id → supabase.from('table').select().eq('user_id', user.id)
```
