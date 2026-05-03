import type { CaseFlag } from '../../shared/api';

export type CaseTemplate = {
  id: string;
  label: string;
  category: string;
  title: string;
  description: string;
  flag: CaseFlag | null;
  estimate: string | null;
};

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    id: 'ban-appeal',
    label: 'Ban Appeal',
    category: 'Appeals',
    title: 'Ban Appeal – u/',
    description: `**User:** u/
**Ban reason:**
**Date banned:**
**Appeal statement:**

**Evidence/context:**

**Recommended action:**`,
    flag: null,
    estimate: '1h',
  },
  {
    id: 'spam-wave',
    label: 'Spam Wave',
    category: 'Moderation',
    title: 'Spam Wave',
    description: `**Pattern:**
**Accounts involved:**
**Affected posts:**

**Action taken:**
**Further action needed:**`,
    flag: 'urgent',
    estimate: '30m',
  },
  {
    id: 'rule-violation',
    label: 'Rule Violation',
    category: 'Moderation',
    title: 'Rule Violation – Rule ',
    description: `**Post/Comment link:**
**Rule violated:**
**Severity:**
**Prior offences:**

**Action taken:**
**Notes:**`,
    flag: null,
    estimate: '30m',
  },
  {
    id: 'harassment',
    label: 'Harassment',
    category: 'Safety',
    title: 'Harassment Report – u/',
    description: `**Reporter:** u/
**Target:** u/
**Reported content:**

**Pattern / severity:**
**Action taken:**
**Follow-up needed:**`,
    flag: 'sensitive',
    estimate: '1h',
  },
  {
    id: 'doxxing',
    label: 'Doxxing Alert',
    category: 'Safety',
    title: 'Doxxing Alert – u/',
    description: `**Victim:** u/
**Content location:**
**Type of info exposed:**

**Action:** Remove immediately and monitor for re-posts
**Reported to admins:**`,
    flag: 'urgent',
    estimate: '30m',
  },
  {
    id: 'misinformation',
    label: 'Misinformation',
    category: 'Content',
    title: 'Misinformation Post',
    description: `**Post link:**
**False claim:**
**Authoritative source:**

**Action taken:**
**User notified:**`,
    flag: 'high',
    estimate: '1h',
  },
  {
    id: 'investigation',
    label: 'Investigation',
    category: 'Content',
    title: 'Ongoing Investigation – ',
    description: `**Subject:**
**Trigger:**
**Scope:**

**Evidence gathered:**
**Next steps:**
**Assigned to:**`,
    flag: 'sensitive',
    estimate: '3d',
  },
];
