import type { Case } from '../../shared/api';
import { timeAgo } from '../utils/time';
import { FLAG_META } from '../utils/flags';

type Props = {
  case: Case;
  onClick: (c: Case) => void;
};

export const KanbanCard = ({ case: c, onClick }: Props) => {
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', c.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onClick(c)}
      className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
          {c.title}
        </span>
        <div className="flex gap-1 flex-wrap flex-shrink-0 mt-0.5">
          {c.flags.map((flag) => {
            const meta = FLAG_META[flag];
            return (
              <span key={flag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${meta.badgeColors}`}>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {c.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {c.description}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-2">
          {c.assignedTo ? (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold">
                {c.assignedTo.charAt(0).toUpperCase()}
              </span>
              <span className="text-gray-500 dark:text-gray-400">u/{c.assignedTo}</span>
            </span>
          ) : (
            <span className="italic text-gray-300 dark:text-gray-600">Unassigned</span>
          )}
          {c.estimate && (
            <span className="flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400 font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {c.estimate}
            </span>
          )}
          {c.notes.length > 0 && (
            <span className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {c.notes.length}
            </span>
          )}
        </div>
        <span>{timeAgo(c.createdAt)}</span>
      </div>
    </button>
  );
};
