import { Hono } from 'hono';
import { context, notifications, redis, reddit } from '@devvit/web/server';
import { type T3 } from '@devvit/shared-types/tid.js';
import type {
  Case,
  CaseNote,
  ActivityEntry,
  CaseFlag,
  CaseStatus,
  InitResponse,
  CasesResponse,
  ErrorResponse,
} from '../../shared/api';

const casesKey = () => `cases:${context.postId}`;
const activityKey = () => `activity:${context.postId}`;

const weekStartFromMs = (timestamp: number): string => {
  const d = new Date(timestamp);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]!;
};

const getCases = async (): Promise<Case[]> => {
  const data = await redis.get(casesKey());
  if (!data) return [];
  const cases = JSON.parse(data) as Case[];
  return cases.map((c) => ({
    ...c,
    sprintWeek: c.sprintWeek ?? weekStartFromMs(c.createdAt),
    estimate: c.estimate ?? null,
  }));
};

const getActivity = async (): Promise<ActivityEntry[]> => {
  const data = await redis.get(activityKey());
  return data ? (JSON.parse(data) as ActivityEntry[]) : [];
};

const saveCases = async (cases: Case[]) => {
  await redis.set(casesKey(), JSON.stringify(cases));
};

const pushActivity = async (
  existing: ActivityEntry[],
  entry: ActivityEntry
): Promise<ActivityEntry[]> => {
  const updated = [entry, ...existing].slice(0, 50);
  await redis.set(activityKey(), JSON.stringify(updated));
  return updated;
};

const genId = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const sendNotification = async (to: string, title: string, body: string, caseId?: string): Promise<void> => {
  try {
    const postId = context.postId;
    const subredditName = context.subredditName;
    if (!postId) return;

    // Store deep-link key so the board auto-opens the case on next visit.
    if (caseId) {
      await redis.set(`pending_case:${to}`, caseId, {
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    // 1. Try push notification (opted-in users get a proper bell notification).
    let pushed = false;
    try {
      const user = await reddit.getUserByUsername(to);
      if (user) {
        const result = await notifications.enqueue({
          title,
          body,
          recipients: [{ userId: user.id, link: postId as T3, data: {} }],
        });
        pushed = result.successCount > 0;
      }
    } catch { /* ignore, fall through to PM */ }

    // 2. Fallback: send a PM from the subreddit account so it shows as a real
    //    inbox message (not a "message request") and always rings the bell.
    if (!pushed && subredditName) {
      await reddit.sendPrivateMessageAsSubreddit({
        to,
        subject: title,
        text: `${body}\n\n*Sent by Mod-Sync*`,
        fromSubredditName: subredditName,
      });
    }
  } catch { /* non-fatal */ }
};

const parseMentions = (text: string): string[] => {
  const matches = text.match(/u\/([A-Za-z0-9_-]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2)))];
};

export const api = new Hono();

const MODS_CACHE_MS = 10 * 60 * 1000; // reuse cached list for 10 minutes

const fetchModeratorNames = async (subredditName: string): Promise<string[]> => {
  const fetchMods = (async () => {
    const listing = reddit.getModerators({ subredditName });
    const users = await listing.all();
    return users.map((u) => u.username);
  })();
  const fallback = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 4000));
  return Promise.race([fetchMods, fallback]);
};

const getModeratorNames = async (subredditName: string, mustInclude?: string): Promise<string[]> => {
  const cacheKey = `mods:${subredditName}`;

  // Serve from cache when fresh — avoids blocking /init on every load
  try {
    const raw = await redis.get(cacheKey);
    if (raw) {
      const { mods, ts } = JSON.parse(raw) as { mods: string[]; ts: number };
      if (Date.now() - ts < MODS_CACHE_MS) {
        // Cache hit — but if the user isn't listed, do a one-time fresh fetch.
        // This handles the case where a mod was added after the cache was written.
        if (!mustInclude || mods.includes(mustInclude)) return mods;
      }
    }
  } catch { /* ignore cache read errors */ }

  // Fetch with a 4-second hard timeout so a slow listing never hangs the handler
  try {
    const mods = await fetchModeratorNames(subredditName);
    if (mods.length > 0) {
      await redis.set(cacheKey, JSON.stringify({ mods, ts: Date.now() }));
    }
    return mods;
  } catch {
    return [];
  }
};

api.get('/init', async (c) => {
  if (!context.postId) {
    return c.json<ErrorResponse>({ type: 'error', message: 'No postId in context' }, 400);
  }
  const [username, cases, activity] = await Promise.all([
    reddit.getCurrentUsername(),
    getCases(),
    getActivity(),
  ]);
  const actor = username ?? 'anonymous';

  const subredditName = context.subredditName ?? '';
  const mods = subredditName ? await getModeratorNames(subredditName, actor) : [];
  const notificationsEnabled = await notifications.optInCurrentUser()
    .then((r) => r.success)
    .catch(() => false); // non-fatal; PM fallback covers non-opted-in users
  // Fail open: if mods list is empty (e.g. dev environment), allow access
  const isMod = mods.length === 0 || mods.includes(actor);

  const pendingKey = `pending_case:${actor}`;
  const openCaseId = await redis.get(pendingKey);
  if (openCaseId) void redis.del(pendingKey);

  return c.json<InitResponse>({
    type: 'init',
    username: actor,
    isMod,
    mods,
    cases,
    activity,
    openCaseId: openCaseId ?? null,
    notificationsEnabled,
  });
});

// Lightweight endpoint for splash to check if the current user has a pending
// notification deep-link without loading the full board data.
api.get('/pending-case', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return c.json({ hasPending: false });
  const caseId = await redis.get(`pending_case:${username}`);
  return c.json({ hasPending: !!caseId });
});

api.post('/cases/create', async (c) => {
  if (!context.postId) {
    return c.json<ErrorResponse>({ type: 'error', message: 'No postId in context' }, 400);
  }
  const { title, description, flags, assignedTo, estimate } = await c.req.json<{
    title: string;
    description: string;
    flags: CaseFlag[];
    assignedTo: string | null;
    estimate: string | null;
  }>();
  const [username, cases, activity] = await Promise.all([
    reddit.getCurrentUsername(),
    getCases(),
    getActivity(),
  ]);
  const actor = username ?? 'anonymous';
  const now = Date.now();
  const newCase: Case = {
    id: genId(),
    title: title.trim(),
    description: description.trim(),
    status: 'open',
    flags: flags ?? [],
    assignedTo: assignedTo?.trim() || null,
    estimate: estimate?.trim() || null,
    notes: [],
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
    sprintWeek: weekStartFromMs(now),
  };
  const updatedCases = [newCase, ...cases];
  const updatedActivity = await pushActivity(activity, {
    id: genId(),
    message: `created case "${newCase.title}"`,
    actor,
    timestamp: now,
    caseId: newCase.id,
    caseTitle: newCase.title,
  });
  await saveCases(updatedCases);

  if (newCase.assignedTo && newCase.assignedTo !== actor) {
    void sendNotification(
      newCase.assignedTo,
      `[Mod-Sync] Case assigned to you`,
      `u/${actor} assigned "${newCase.title}" to you`,
      newCase.id
    );
  }

  return c.json<CasesResponse>({ type: 'cases', cases: updatedCases, activity: updatedActivity });
});

api.post('/cases/update', async (c) => {
  if (!context.postId) {
    return c.json<ErrorResponse>({ type: 'error', message: 'No postId in context' }, 400);
  }
  const body = await c.req.json<{
    id: string;
    title?: string;
    description?: string;
    status?: CaseStatus;
    flags?: CaseFlag[];
    assignedTo?: string | null;
    estimate?: string | null;
    sprintWeek?: string;
  }>();
  const [username, cases, activity] = await Promise.all([
    reddit.getCurrentUsername(),
    getCases(),
    getActivity(),
  ]);
  const actor = username ?? 'anonymous';
  const now = Date.now();
  const idx = cases.findIndex((item) => item.id === body.id);
  if (idx === -1) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }
  const prev = cases[idx];
  if (prev === undefined) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }

  const updated: Case = {
    id: prev.id,
    title: body.title !== undefined ? body.title.trim() : prev.title,
    description: body.description !== undefined ? body.description.trim() : prev.description,
    status: body.status ?? prev.status,
    flags: body.flags ?? prev.flags,
    assignedTo: 'assignedTo' in body ? (body.assignedTo ?? null) : prev.assignedTo,
    estimate: 'estimate' in body ? (body.estimate?.trim() || null) : (prev.estimate ?? null),
    notes: prev.notes,
    createdBy: prev.createdBy,
    createdAt: prev.createdAt,
    updatedAt: now,
    sprintWeek: body.sprintWeek ?? prev.sprintWeek ?? weekStartFromMs(prev.createdAt),
  };
  cases[idx] = updated;
  await saveCases(cases);

  const logs: string[] = [];
  if (body.status !== undefined && body.status !== prev.status) {
    logs.push(`moved "${updated.title}" to ${body.status}`);
  }
  if ('assignedTo' in body && body.assignedTo !== prev.assignedTo) {
    logs.push(
      body.assignedTo
        ? `assigned "${updated.title}" to u/${body.assignedTo}`
        : `unassigned "${updated.title}"`
    );
  }
  if (body.title !== undefined && body.title.trim() !== prev.title) {
    logs.push(`renamed case to "${updated.title}"`);
  }
  if (body.sprintWeek !== undefined && body.sprintWeek !== (prev.sprintWeek ?? weekStartFromMs(prev.createdAt))) {
    logs.push(`moved "${updated.title}" to sprint week ${body.sprintWeek}`);
  }
  if (logs.length === 0) logs.push(`updated "${updated.title}"`);

  let updatedActivity = activity;
  for (const msg of logs) {
    updatedActivity = await pushActivity(updatedActivity, {
      id: genId(),
      message: msg,
      actor,
      timestamp: now,
      caseId: updated.id,
      caseTitle: updated.title,
    });
  }

  // Notify newly assigned mod (skip if they assigned it to themselves)
  if (
    'assignedTo' in body &&
    body.assignedTo &&
    body.assignedTo !== prev.assignedTo &&
    body.assignedTo !== actor
  ) {
    void sendNotification(
      body.assignedTo,
      `[Mod-Sync] Case assigned to you`,
      `u/${actor} assigned "${updated.title}" to you`,
      updated.id
    );
  }

  return c.json<CasesResponse>({ type: 'cases', cases, activity: updatedActivity });
});

api.post('/cases/add-note', async (c) => {
  if (!context.postId) {
    return c.json<ErrorResponse>({ type: 'error', message: 'No postId in context' }, 400);
  }
  const { id, text } = await c.req.json<{ id: string; text: string }>();
  const [username, cases, activity] = await Promise.all([
    reddit.getCurrentUsername(),
    getCases(),
    getActivity(),
  ]);
  const actor = username ?? 'anonymous';
  const now = Date.now();
  const idx = cases.findIndex((item) => item.id === id);
  if (idx === -1) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }
  const existing = cases[idx];
  if (existing === undefined) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }

  const newNote: CaseNote = { id: genId(), text: text.trim(), author: actor, createdAt: now };
  cases[idx] = { ...existing, notes: [...existing.notes, newNote], updatedAt: now };

  await saveCases(cases);
  const updatedActivity = await pushActivity(activity, {
    id: genId(),
    message: `added note to "${existing.title}"`,
    actor,
    timestamp: now,
    caseId: existing.id,
    caseTitle: existing.title,
  });

  const notifyText = `u/${actor} commented on "${existing.title}": ${text.trim()}`;

  // Notify assignee when someone else comments
  if (existing.assignedTo && existing.assignedTo !== actor) {
    void sendNotification(
      existing.assignedTo,
      `[Mod-Sync] New comment on your case`,
      notifyText,
      existing.id
    );
  }

  // Notify mentioned users (excluding actor and assignee already notified)
  const mentioned = parseMentions(text).filter(
    (u) => u !== actor && u !== existing.assignedTo
  );
  for (const u of mentioned) {
    void sendNotification(u, `[Mod-Sync] You were mentioned in a case`, notifyText, existing.id);
  }

  return c.json<CasesResponse>({ type: 'cases', cases, activity: updatedActivity });
});

api.post('/cases/delete', async (c) => {
  if (!context.postId) {
    return c.json<ErrorResponse>({ type: 'error', message: 'No postId in context' }, 400);
  }
  const { id } = await c.req.json<{ id: string }>();
  const [username, cases, activity] = await Promise.all([
    reddit.getCurrentUsername(),
    getCases(),
    getActivity(),
  ]);
  const actor = username ?? 'anonymous';
  const now = Date.now();
  const idx = cases.findIndex((item) => item.id === id);
  if (idx === -1) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }
  const deleted = cases[idx];
  if (deleted === undefined) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Case not found' }, 404);
  }

  const updatedCases = cases.filter((item) => item.id !== id);
  await saveCases(updatedCases);
  const updatedActivity = await pushActivity(activity, {
    id: genId(),
    message: `deleted case "${deleted.title}"`,
    actor,
    timestamp: now,
    caseId: deleted.id,
    caseTitle: deleted.title,
  });
  return c.json<CasesResponse>({ type: 'cases', cases: updatedCases, activity: updatedActivity });
});
