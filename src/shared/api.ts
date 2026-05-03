export type CaseStatus = 'open' | 'in-progress' | 'resolved';
export type CaseFlag = 'low' | 'medium' | 'high' | 'urgent' | 'sensitive';

export type CaseNote = {
  id: string;
  text: string;
  author: string;
  createdAt: number;
};

export type Case = {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  flags: CaseFlag[];
  assignedTo: string | null;
  estimate: string | null; // e.g. "2h", "1d", "30m"
  linkedUrl: string | null; // Reddit post/comment URL
  notes: CaseNote[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  sprintWeek: string; // ISO Monday date, e.g. "2026-04-28"
};

export type ActivityEntry = {
  id: string;
  message: string;
  actor: string;
  timestamp: number;
  caseId: string;
  caseTitle: string;
};

export type InitResponse = {
  type: 'init';
  username: string;
  isMod: boolean;
  mods: string[];
  cases: Case[];
  activity: ActivityEntry[];
  openCaseId: string | null;
  notificationsEnabled: boolean;
};

export type CasesResponse = {
  type: 'cases';
  cases: Case[];
  activity: ActivityEntry[];
};

export type ErrorResponse = {
  type: 'error';
  message: string;
};

export type RedditPreviewData = {
  title: string;
  author: string;
  subreddit: string;
  flair: string | null;
};
