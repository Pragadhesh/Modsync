## Mod-Sync

A Devvit-powered moderation tool that solves context loss between mod shifts.

Mod-Sync gives subreddit mod teams a shared, persistent Kanban board to track pending cases, leave structured notes, flag urgent issues, assign tasks to specific mods, and log recent team actions — all without any external setup.

**Target users:** Large and mid-sized subreddits with active mod teams across multiple timezones (e.g. r/india, r/cricket, r/AskReddit).

### Core Features

- Kanban board with Open / In Progress / Resolved columns
- Per-case notes editable across sessions
- Urgent/sensitive flag system
- Mod assignment per case
- Activity log of recent team actions
- One-click install via Devvit App Directory

### Built with

- [Devvit](https://developers.reddit.com/): Reddit's developer platform
- [Vite](https://vite.dev/): Frontend bundler
- [React](https://react.dev/): UI
- [Hono](https://hono.dev/): Backend routing
- [Tailwind](https://tailwindcss.com/): Styles
- [TypeScript](https://www.typescriptlang.org/): Type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app
