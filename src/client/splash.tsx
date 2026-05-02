import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { context, requestExpandedMode } from '@devvit/web/client';

export const Splash = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-white dark:bg-gray-900 px-6">
      {/* Logo / brand */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-2 shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mod-Sync</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Shared mod board — track cases, leave notes, and stay in sync across shifts.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {['Kanban board', 'Case notes', 'Urgent flags', 'Mod assignment', 'Activity log'].map((f) => (
          <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {f}
          </span>
        ))}
      </div>

      {context.username && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Signed in as <span className="font-medium text-gray-600 dark:text-gray-300">u/{context.username}</span>
        </p>
      )}

      <button
        className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors shadow-md"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Open Board
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
