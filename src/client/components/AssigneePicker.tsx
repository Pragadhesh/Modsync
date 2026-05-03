import { useState, useRef, useEffect } from 'react';

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
];

const avatarColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) & 0x7fffffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
};

type Props = {
  value: string; // '' = unassigned, otherwise username
  mods: string[];
  currentUsername: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const AssigneePicker = ({ value, mods, currentUsername, onChange, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // current user first, then others alphabetically
  const allMods = [currentUsername, ...mods.filter((m) => m !== currentUsername).sort()];

  const filtered = allMods.filter((m) =>
    search === '' || m.toLowerCase().includes(search.toLowerCase())
  );
  const showUnassigned = search === '' || 'unassigned'.includes(search.toLowerCase());

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch('');
  };

  const displayLabel = value
    ? value === currentUsername
      ? `u/${value} (me)`
      : `u/${value}`
    : 'Unassigned';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}
          border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:outline-none focus:border-indigo-400`}
      >
        {value ? (
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarColor(value)}`}>
            {value.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
        )}
        <span className="flex-1 truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="px-2 pt-2 pb-1">
            <input
              autoFocus
              type="text"
              placeholder="Search assignee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {/* Unassigned option */}
            {showUnassigned && (
              <li>
                <button
                  type="button"
                  onClick={() => select('')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 text-left">Unassigned</span>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    value === ''
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {value === '' && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            )}

            {/* Mod options */}
            {filtered.map((mod) => {
              const isMe = mod === currentUsername;
              const isSelected = value === mod;
              const color = avatarColor(mod);
              return (
                <li key={mod}>
                  <button
                    type="button"
                    onClick={() => select(mod)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${color}`}>
                      {mod.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 text-left truncate">
                      u/{mod}{isMe ? ' (me)' : ''}
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}

            {filtered.length === 0 && !showUnassigned && (
              <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-600 italic">No mods found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
