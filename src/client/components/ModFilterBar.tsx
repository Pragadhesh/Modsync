import type { Case } from '../../shared/api';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
];

const avatarColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) & 0x7fffffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
};

export const UNASSIGNED = '__unassigned__';

type Props = {
  allCases: Case[];
  selected: string | null; // null = all, UNASSIGNED, or a username
  currentUsername: string;
  onChange: (filter: string | null) => void;
};

export const ModFilterBar = ({ allCases, selected, currentUsername, onChange }: Props) => {
  const assignees = (() => {
    const set = new Set<string>();
    for (const c of allCases) {
      if (c.assignedTo) set.add(c.assignedTo);
    }
    const others = [...set].filter((u) => u !== currentUsername).sort();
    return set.has(currentUsername) ? [currentUsername, ...others] : others;
  })();

  const hasUnassigned = allCases.some((c) => !c.assignedTo);

  const toggle = (value: string | null) => {
    onChange(selected === value ? null : value);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center gap-1.5 flex-shrink-0 overflow-x-auto">
      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1 flex-shrink-0">
        Assignee
      </span>

      {/* All */}
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-all border ${
          selected === null
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        All
      </button>

      {/* Unassigned */}
      {(hasUnassigned || selected === UNASSIGNED) && (
        <button
          onClick={() => toggle(UNASSIGNED)}
          title="Unassigned"
          className={`flex-shrink-0 flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full text-xs font-medium transition-all border ${
            selected === UNASSIGNED
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          Unassigned
        </button>
      )}

      {/* Mod avatar chips */}
      {assignees.map((username) => {
        const isSelected = selected === username;
        const isMe = username === currentUsername;
        const color = avatarColor(username);
        return (
          <button
            key={username}
            onClick={() => toggle(username)}
            title={`u/${username}`}
            className={`flex-shrink-0 flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full text-xs font-medium transition-all border ${
              isSelected
                ? `${color} text-white border-transparent ring-2 ring-offset-1 ring-indigo-400 dark:ring-indigo-500`
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                isSelected ? 'bg-white/20' : color
              }`}
            >
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[96px] truncate">
              {isMe ? 'Me' : `u/${username}`}
            </span>
          </button>
        );
      })}
    </div>
  );
};
