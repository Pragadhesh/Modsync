import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
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

export const api = new Hono();

const getModeratorNames = async (subredditName: string): Promise<string[]> => {
  try {
    const listing = await reddit.getModerators({ subredditName });
    const users = await listing.all();
    return users.map((u) => u.username);
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
  const mods = subredditName ? await getModeratorNames(subredditName) : [];
  // Fail open: if mods list is empty (e.g. dev environment), allow access
  const isMod = mods.length === 0 || mods.includes(actor);

  return c.json<InitResponse>({
    type: 'init',
    username: actor,
    isMod,
    mods,
    cases,
    activity,
  });
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
