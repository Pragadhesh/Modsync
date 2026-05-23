# Mod-Sync

A Devvit-powered moderation tool that solves context loss between mod shifts.

Mod-Sync gives subreddit mod teams a shared, persistent Kanban board to track pending cases, leave structured notes, flag urgent issues, assign tasks to specific mods, and log recent team actions — all without any external setup.

**Target users:** Large and mid-sized subreddits with active mod teams spread across multiple timezones.

---

## Features

- **Kanban board** — three columns: Open, In Progress, Resolved — drag cards between them as cases move forward
- **Per-case notes** — append notes across sessions so the next mod knows exactly where things stand
- **Case templates** — quickly start common case types like ban appeals, spam reports, and content reviews
- **Flag system** — mark cases as Urgent (red) or Sensitive (purple) for instant prioritization
- **Mod assignment & filtering** — assign cases to specific mods and filter the board by assignee
- **Assignment notifications** — mods are notified the moment a case is assigned to them
- **Time estimates** — set expected effort via free-text or preset chips (30m, 1h, 2h, 4h, 1d, 3d)
- **Sprint week navigation** — organize cases by week; move open ones forward for long-running investigations
- **Team activity log** — slide-up drawer showing the last 50 actions across the team
- **Zero setup** — install once from the App Directory, pin to the mod dashboard, and it's live

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Vite |
| Backend | Devvit serverless functions, Node 22 |
| API layer | Hono REST API |
| Storage | Redis via `@devvit/web/server` |
| Hosting | Devvit iFrame (custom post) |

---

## Getting Started

> Make sure you have Node 22 installed before running.

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard — you will need a Reddit account connected to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev` — starts a live development server on Reddit
- `npm run build` — builds the client and server
- `npm run deploy` — type-check, lint, test, and upload
- `npm run type-check` — TypeScript and lint check
