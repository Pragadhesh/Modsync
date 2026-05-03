import { useState, useRef, useEffect } from 'react';
import type { Case } from '../../shared/api';

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

export const UNASSIGNED = '__unassigned__';

type Props = {
  allCases: Case[];
  selected: string | null; // null = all, UNASSIGNED, or a username
  currentUsername: string;
  onChange: (filter: string | null) => void;
};

export const ModFilterBar = ({ allCases, selected, currentUsername, onChange }: Props) => {
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

  const assignees = (() => {
    const set = new Set<string>();
    for (const c of allCases) {
      if (c.assignedTo) set.add(c.assignedTo);
    }
    const others = [...set].filter((u) => u !== currentUsername).sort();
    return set.has(currentUsername) ? [currentUsername, ...others] : others;
  })();

  const hasUnassigned = allCases.some((c) => !c.assignedTo);

  const filtered = assignees.filter(
    (m) => search === '' || m.toLowerCase().includes(search.toLowerCase())
  );
  const showUnassigned =
    hasUnassigned && (search === '' || 'unassigned'.includes(search.toLowerCase()));
  const showAll = search === '' || 'all'.includes(search.toLowerCase());

  const select = (value: string | null) => {
    onChange(value);
    setOpen(false);
    setSearch('');
  };

  // Trigger label
  const triggerContent = (() => {
    if (selected === null) return { label: 'All', avatar: null };
    if (selected === UNASSIGNED) return { label: 'Unassigned', avatar: null };
    const isMe = selected === currentUsername;
    return { label: isMe ? `u/${selected} (me)` : `u/${selected}`, avatar: selected };
  })();

  const isFiltered = selected !== null;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide flex-shrink-0">
        Filters
      </span>

      {/* Assignee filter dropdown */}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-md text-xs font-medium border transition-all
            ${isFiltered
              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
            }`}
        >
          <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">Assignee:</span>

          {triggerContent.avatar ? (
            <span className="flex items-center gap-1">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${avatarColor(triggerContent.avatar)}`}>
                {triggerContent.avatar.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[96px] truncate">{triggerContent.label}</span>
            </span>
          ) : (
            <span>{triggerContent.label}</span>
          )}

          <svg
            className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ml-0.5 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
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

            <ul className="max-h-52 overflow-y-auto py-1">
              {/* All */}
              {showAll && (
                <li>
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 text-left">All</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected === null ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected === null && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              )}

              {/* Unassigned */}
              {showUnassigned && (
                <li>
                  <button
                    type="button"
                    onClick={() => select(UNASSIGNED)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 text-left">Unassigned</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected === UNASSIGNED ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected === UNASSIGNED && (
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
                const isSelected = selected === mod;
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
                        {isMe ? 'Me' : `u/${mod}`}
                      </span>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'
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

              {filtered.length === 0 && !showUnassigned && !showAll && (
                <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-600 italic">No mods found</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Clear filter badge */}
      {isFiltered && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
        >
          Clear
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
