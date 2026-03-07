# AI Job Outreach — Web Dashboard

AI-powered job application tracker with email generation, Kanban board, and follow-up automation.

## Stack
- **Next.js 15** (App Router) + TypeScript
- **Neon** PostgreSQL + **Prisma 7**
- **NextAuth v5** — Google OAuth
- **Groq** (LLaMA 3.3 70B) — email/score generation
- **Gemini 1.5 Flash** — screenshot/image extraction
- **Gmail API** — send emails from user's account
- **Resend** — follow-up notification emails
- **Tailwind v4** + Orbitron font
- **dnd-kit** — Kanban drag & drop
- **Recharts** — analytics charts

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in all values — see comments in .env.example
```

### 3. Set up Neon database
1. Go to https://console.neon.tech
2. Create a new project
3. Copy the connection string to `DATABASE_URL` 

  ### 4. Set up Google OAuth (for login)
  1. Go to https://console.cloud.google.com
  2. Create a project → APIs & Services → Credentials
  3. Create OAuth 2.0 Client ID (Web application)
  4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
  5. Copy Client ID + Secret to `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

  ### 5. Set up Gmail API (for sending emails)
  1. Same GCP project → Enable Gmail API
  2. Create separate OAuth 2.0 credentials for Gmail
  3. Add redirect URI: `http://localhost:3000/api/gmail/auth`
  4. Copy to `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`

### 6. Get AI API keys
- **Groq**: https://console.groq.com — free
- **Gemini**: https://aistudio.google.com/app/apikey — free

### 7. Get Resend API key
- https://resend.com — 3,000 emails/month free

### 8. Run database migration
```bash
npm run db:generate   # REQUIRED in Prisma 7 (not auto-run)
npm run db:push       # Push schema to Neon
```

### 9. Start dev server
```bash
npm run dev
```

## Features
- **Email Generation** — paste text, upload screenshot, or enter URL
- **AI Profile Selection** — auto-picks best resume for each job
- **Kanban Board** — drag cards to update application status
- **Match Scoring** — AI evaluates candidate-job fit (0-100)
- **Follow-up Cron** — daily check, sends reminder notifications
- **Analytics** — monthly charts, interview/offer rates
- **Gmail Integration** — send directly or use compose link
- **Multi-Profile** — different resumes for different role types
- **Dark Mode** — black/gold + white/blue themes

## Deployment (Vercel)
```bash
# Push to GitHub, connect to Vercel
# Add all env vars in Vercel dashboard
# Cron runs automatically via vercel.json
```

## Docker
```bash
docker build -t ai-job-outreach .
docker run -p 3000:3000 --env-file .env.local ai-job-outreach
```

## File Count: 80 files
