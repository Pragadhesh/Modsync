import { useCallback, useEffect, useState } from 'react';
import type {
  Case,
  ActivityEntry,
  CaseFlag,
  CaseStatus,
  InitResponse,
  CasesResponse,
} from '../../shared/api';

type BoardState = {
  username: string | null;
  isMod: boolean;
  mods: string[];
  cases: Case[];
  activity: ActivityEntry[];
  openCaseId: string | null;
  notificationsEnabled: boolean;
  loading: boolean;
  error: string | null;
};

const post = async (url: string, body: object): Promise<CasesResponse> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<CasesResponse>;
};

export const useBoard = () => {
  const [state, setState] = useState<BoardState>({
    username: null,
    isMod: true,
    mods: [],
    cases: [],
    activity: [],
    openCaseId: null,
    notificationsEnabled: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as InitResponse;
        setState({ username: data.username, isMod: data.isMod, mods: data.mods, cases: data.cases, activity: data.activity, openCaseId: data.openCaseId, notificationsEnabled: data.notificationsEnabled, loading: false, error: null });
      } catch {
        setState((prev) => ({ ...prev, loading: false, error: 'Failed to load board' }));
      }
    };
    void init();
  }, []);

  const applyResponse = useCallback((data: CasesResponse) => {
    setState((prev) => ({ ...prev, cases: data.cases, activity: data.activity }));
  }, []);

  const createCase = useCallback(
    async (title: string, description: string, flags: CaseFlag[], assignedTo: string | null, estimate: string | null) => {
      const data = await post('/api/cases/create', { title, description, flags, assignedTo, estimate });
      applyResponse(data);
    },
    [applyResponse]
  );

  const updateCase = useCallback(
    async (
      id: string,
      updates: {
        title?: string;
        description?: string;
        status?: CaseStatus;
        flags?: CaseFlag[];
        assignedTo?: string | null;
        estimate?: string | null;
        sprintWeek?: string;
      }
    ) => {
      const data = await post('/api/cases/update', { id, ...updates });
      applyResponse(data);
    },
    [applyResponse]
  );

  const addNote = useCallback(
    async (id: string, text: string) => {
      const data = await post('/api/cases/add-note', { id, text });
      applyResponse(data);
    },
    [applyResponse]
  );

  const deleteCase = useCallback(
    async (id: string) => {
      const data = await post('/api/cases/delete', { id });
      applyResponse(data);
    },
    [applyResponse]
  );

  return { ...state, createCase, updateCase, addNote, deleteCase };
};
