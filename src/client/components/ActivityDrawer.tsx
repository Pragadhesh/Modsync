import type { ActivityEntry } from '../../shared/api';
import { timeAgo } from '../utils/time';

type Props = {
  entries: ActivityEntry[];
  onClose: () => void;
};

export const ActivityDrawer = ({ entries, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity Log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 italic text-center py-6">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {entry.actor.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">u/{entry.actor}</span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">{entry.message}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{timeAgo(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
