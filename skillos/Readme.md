# SkillOS 🧠

> **The AI-Powered Operating System for Your Learning**

![SkillOS Banner](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2000&auto=format&fit=crop)

### 🚀 **[Live Demo: skillos-hackx.onrender.com](https://skillos-4xuc.onrender.com)**  
*(Note: Please update this link with your actual deployed URL)*

Video Link:

[https://drive.google.com/drive/u/0/folders/15e0NUlDYi9sj8VOX66YcIgb6OzfU81zN](https://drive.google.com/drive/folders/15e0NUlDYi9sj8VOX66YcIgb6OzfU81zN)

---

## 🌟 Overview
**SkillOS** is a futuristic learning environment designed to bridge the gap between where you are and where you want to be. It transforms the chaotic web into a structured, AI-guided learning OS.

It features a "Cognitive Firewall" to block distractions, a "Neural Interface" for AI assistance, and just-in-time "Skill Bridges" that generate personalized learning paths from any job post or documentation you browse.

## ✨ Key Features

### ⚡ **Contextual Skill Bridge** (New!)
Navigate to any job post or documentation, click the **Zap (⚡)** icon, and instantly get:
- **Fit Score**: How well your current skills match the page.
- **Gap Analysis**: Exactly what you're missing.
- **Bridge Plan**: Actionable micro-tasks to close the gap in minutes, not months.

### 🧠 **Neural Interface**
- **AI Assistant**: Always-on chat for deep technical questions.
- **Memory**: Remembers your previous contexts and learnings.

### 🛡️ **Cognitive Firewall**
- **Distraction Blocking**: Focus mode that shields you from social media and noise.
- **Deep Work Timer**: Pomodoro-style flow state management.

### 🌐 **Learning Browser**
- A dedicated browser environment that summarizes pages, takes smart notes, and integrates directly with your Knowledge Base.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Design system**: Custom "macOS-like" glassmorphism, Framer Motion animations
- **Backend**: Supabase (PostgreSQL, Auth)
- **AI**: OpenAI GPT-4o-mini (via Supabase Edge Functions)
- **Deployment**: Render (Frontend), Supabase (Edge Functions)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Account

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/skillos.git
   cd skillos/frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in `frontend/`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

---

## 📦 Deployment

### Frontend (Render)
This project is configured for **Render**. 
1. Connect your repo to Render.
2. Select "Static Site".
3. Build command: `npm run build`
4. Publish directory: `dist`

### Backend (Supabase)
Deploy Edge Functions for AI features:
```bash
supabase functions deploy
```
