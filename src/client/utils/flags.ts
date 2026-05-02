import type { CaseFlag } from '../../shared/api';

export type FlagMeta = {
  label: string;
  /** classes for the toggle button when the flag is active */
  toggleColors: string;
  /** classes for the small badge on a kanban card */
  badgeColors: string;
};

export const ALL_FLAGS: CaseFlag[] = ['low', 'medium', 'high', 'urgent', 'sensitive'];

export const FLAG_META: Record<CaseFlag, FlagMeta> = {
  low: {
    label: 'Low',
    toggleColors: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800',
    badgeColors:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  },
  medium: {
    label: 'Medium',
    toggleColors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    badgeColors:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  },
  high: {
    label: 'High',
    toggleColors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    badgeColors:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  },
  urgent: {
    label: 'Urgent',
    toggleColors: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800',
    badgeColors:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  },
  sensitive: {
    label: 'Sensitive',
    toggleColors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    badgeColors:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  },
};
