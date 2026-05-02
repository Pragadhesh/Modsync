# Mod-Sync

Mod-Sync is a Devvit-powered moderation tool that solves context loss between mod shifts. When one moderator logs off and another logs on, critical information about pending cases, ongoing investigations, and community issues often gets lost.

Mod-Sync provides a shared, persistent Kanban-style board where mod teams can leave structured notes on pending cases, flag posts needing a second opinion, assign tasks to specific mods, and track what has already been handled.

The app operates as a custom post component within the subreddit — mods install it from the App Directory and pin it to their mod dashboard. No external setup required.

## Target Users

Large and mid-sized subreddits with active mod teams spread across multiple timezones — e.g. r/india, r/cricket, r/AskReddit.

## Core Features

- **Persistent case board** — Kanban columns: Open, In Progress, Resolved
- **Sprint/week navigation** — board shows cases for the selected week; cases default to the current ISO week and can be moved to next week
- **Per-case notes** — mods can add notes across sessions (append-only, shown newest first)
- **Flag system** — mark cases as urgent (red) or sensitive (purple)
- **Mod assignment** — tag which mod is handling a case; assignee is optional (can be unassigned)
- **Estimate field** — set time estimates via free text or preset chips (30m, 1h, 2h, 4h, 1d, 3d)
- **Assignee filter bar** — filter board by mod; current user shown as "Me", color-coded avatars per mod
- **Drag-and-drop** — drag cards between columns to change status
- **Activity log drawer** — recent team actions visible to all mods, slides up from bottom
- **Batched saves** — status/title/description/estimate changes are only persisted on explicit "Save changes"; sprint week, flags, and assignment changes are immediate
- **Clean install experience** — via Devvit App Directory, pin to mod dashboard

## Tech Stack & Architecture

See `AGENTS.md` for full technical details. Summary:

- **Frontend**: React 19, Tailwind CSS 4, Vite (runs in an iFrame on reddit.com)
- **Backend**: Devvit serverless (Node 22), Hono REST API
- **Storage**: Redis via `@devvit/web/server`
- **Entrypoints**: `src/client/game.html` (expanded view), `src/client/splash.html` (feed/inline view)

## Commands

- `npm run dev` — live development server on Reddit (`devvit playtest`) — no rebuild needed between changes
- `npm run build` — build client and server
- `npm run deploy` — type-check + lint + test + `devvit upload`
- `npm run type-check` — TypeScript + lint check

## File Structure

```
src/
  shared/
    api.ts                   # All shared TypeScript types (Case, ActivityEntry, responses)
  client/
    game.html                # Expanded view entrypoint (Devvit iFrame)
    game.tsx                 # Main App component + board layout
    splash.html              # Inline feed view entrypoint
    splash.tsx               # Splash/inline view component
    index.css                # Global styles
    hooks/
      useBoard.ts            # All board state + API calls (createCase, updateCase, addNote, deleteCase)
    components/
      KanbanCard.tsx         # Draggable card shown in each kanban column
      CaseDetailModal.tsx    # Full case view/edit modal (centered overlay, batched save)
      NewCaseModal.tsx       # Create case modal (title, assignee, estimate, description, flags)
      ActivityDrawer.tsx     # Team activity log, slides up from bottom
      ModFilterBar.tsx       # Horizontal assignee filter bar with color-coded mod avatars
    utils/
      time.ts                # timeAgo, getWeekStart, shiftWeek, formatWeekRange (all UTC)
  server/
    index.ts                 # Hono app entry, mounts routes
    core/
      post.ts                # createPost() — submits the Devvit custom post
    routes/
      api.ts                 # REST endpoints: /init, /cases/create, /cases/update, /cases/add-note, /cases/delete
      forms.ts               # Devvit form handlers
      menu.ts                # Devvit menu item handlers
      triggers.ts            # Devvit event triggers
```

## Data Model (`src/shared/api.ts`)

```typescript
type CaseStatus = 'open' | 'in-progress' | 'resolved';
type CaseFlag   = 'urgent' | 'sensitive';

type Case = {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  flags: CaseFlag[];
  assignedTo: string | null;       // Reddit username or null
  estimate: string | null;         // e.g. "2h", "1d", "30m"
  notes: CaseNote[];
  createdBy: string;
  createdAt: number;               // Unix ms
  updatedAt: number;               // Unix ms
  sprintWeek: string;              // ISO Monday date, e.g. "2026-04-28"
};

type ActivityEntry = {
  id: string;
  message: string;
  actor: string;
  timestamp: number;
  caseId: string;
  caseTitle: string;
};
```

## API Endpoints (`src/server/routes/api.ts`)

All endpoints require `context.postId` to be set (Devvit context).

| Method | Path               | Description                                                    |
|--------|--------------------|----------------------------------------------------------------|
| GET    | /init              | Returns username, all cases, activity log                      |
| POST   | /cases/create      | Create a new case; body: `{title, description, flags, assignedTo, estimate}` |
| POST   | /cases/update      | Update fields; body: `{id, title?, description?, status?, flags?, assignedTo?, estimate?, sprintWeek?}` |
| POST   | /cases/add-note    | Append a note; body: `{id, text}`                             |
| POST   | /cases/delete      | Delete a case; body: `{id}`                                   |

Redis keys: `cases:{postId}` and `activity:{postId}` (JSON arrays).  
Activity log is capped at 50 entries (newest first).

## Key Patterns & Conventions

### UTC-only week arithmetic
All week calculations use UTC methods (`getUTCDay`, `setUTCDate`, `setUTCHours`) on both client (`utils/time.ts`) and server (`weekStartFromMs` in `api.ts`). Date strings are always parsed with `'T00:00:00Z'` suffix to avoid local-timezone shifts. This was necessary because server runs in UTC while client may be in any timezone.

### Batched save in `CaseDetailModal`
Title, description, estimate, and status changes are tracked in local state (`isDirty`). A "Save changes" button appears when dirty and calls `onUpdate` once with all changed fields. The modal auto-closes on successful save. Flags, assignment, and sprint week have immediate saves (no batch) since they are single-action changes.

### `localStatus` pattern
`CaseDetailModal` keeps `localStatus` state to defer status changes until save. The header badge shows a `*` indicator when `statusDirty`. This prevents status changes from being visible on the board before the user explicitly saves.

### Responsive layout breakpoint
- `< 640px` (`sm:hidden` counterpart): mobile tab layout — single column with tab bar across the top; tab headers also accept drag-and-drop with auto-tab-switch
- `≥ 640px` (`hidden sm:flex`): 3-column Kanban desktop layout with `divide-x` column separators and `border-t-4` colored column headers

### `sprintWeek` backfill
Old Redis records without `sprintWeek` are backfilled in `getCases()` using `weekStartFromMs(c.createdAt)`.

### ModFilterBar avatar colors
Username → deterministic color via `hash = (hash * 31 + charCode) & 0x7fffffff`, modulo 8-color palette. Current user always appears first labeled "Me".

### `UNASSIGNED` sentinel
`ModFilterBar` exports `UNASSIGNED = '__unassigned__'`. In `game.tsx`, `assigneeFilter` is `null` (all), `UNASSIGNED`, or a username string.
