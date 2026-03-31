# HeartsHeal ♥

A free, compassionate app for people navigating grief, heartbreak, job loss, loneliness, or any form of loss. Built with Next.js and deployed on Vercel.

**Live:** Your Vercel URL here

---

## What It Does

HeartsHeal offers a safe, calming space with:

- **Haven AI Companion** — A trauma-informed AI (powered by Claude) that listens without judgment and supports people through loss
- **Guided Breathing** — Multiple breathing techniques (Box, 4-7-8, Relaxation, etc.) with animations and audio cues
- **Thoughts Journal** — Guided journaling with AI-personalized prompts based on your current mood
- **Emotional Log** — Track emotions over time and visualize patterns
- **Self-Compassion Quizzes** — Reflective exercises grounded in mindfulness research
- **Crisis Resources** — Always-visible links to 988 and Crisis Text Line

**Everything is 100% free. No accounts, no subscriptions, no limits.**

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Anthropic Claude (claude-sonnet-4)
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Data Storage:** Browser localStorage (no database needed)
- **Deployment:** Vercel

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Hearts_Journal
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Go to **Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` → your Anthropic key
4. Deploy

That's it. No database, no payment keys, no other config needed.

---

## Project Structure

```
app/
  page.tsx              ← Home dashboard
  companion/            ← Haven AI Companion
  breathe/              ← Guided breathing
  thoughts/             ← Journal + quizzes
  emotional-log/        ← Emotion tracking
  about/                ← About page
  faq/                  ← FAQ
  app-status/           ← Status + settings
  api/
    ai/route.ts         ← Secure AI proxy (server-side)

components/
  haven-companion       ← AI chat interface
  ai-journal-prompt     ← AI prompt generator
  ai-breathing-affirmation ← AI affirmations
  bottom-nav            ← Mobile navigation
  desktop-nav           ← Desktop navigation
  footer                ← Footer with crisis links
  ...

contexts/
  haptic-context        ← Haptic feedback
```

---

## Important Notes

- **AI calls are server-side only.** The `ANTHROPIC_API_KEY` never touches the browser. All AI requests go through `/api/ai/route.ts`.
- **No database.** All user data (journals, emotion logs, quiz results) lives in `localStorage`. Clearing browser data clears everything.
- **Crisis safety.** Haven AI always surfaces 988 and Crisis Text Line. If users express distress, Haven is prompted to provide crisis resources.
- **Not a therapy replacement.** HeartsHeal is a supportive tool, not a substitute for professional mental health care.

---

## Created By

HeartsHeal was designed and built by **Lamar Newsome** — driven by personal experience with grief and the belief that healing tools should be free and accessible to everyone.
