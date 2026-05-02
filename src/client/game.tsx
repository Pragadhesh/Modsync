import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Case, CaseStatus } from '../shared/api';
import { useBoard } from './hooks/useBoard';
import { KanbanCard } from './components/KanbanCard';
import { CaseDetailModal } from './components/CaseDetailModal';
import { NewCaseModal } from './components/NewCaseModal';
import { ActivityDrawer } from './components/ActivityDrawer';
import { ModFilterBar, UNASSIGNED } from './components/ModFilterBar';
import { getWeekStart, shiftWeek, formatWeekRange } from './utils/time';

const COLUMNS: { status: CaseStatus; label: string; dot: string; topBorder: string; hoverBg: string }[] = [
  { status: 'open',        label: 'Open',        dot: 'bg-blue-500',  topBorder: 'border-t-blue-500',  hoverBg: 'bg-blue-50/60 dark:bg-blue-950/20'  },
  { status: 'in-progress', label: 'In Progress', dot: 'bg-amber-500', topBorder: 'border-t-amber-500', hoverBg: 'bg-amber-50/60 dark:bg-amber-950/20' },
  { status: 'resolved',    label: 'Resolved',    dot: 'bg-green-500', topBorder: 'border-t-green-500', hoverBg: 'bg-green-50/60 dark:bg-green-950/20'  },
];

export const App = () => {
  const board  = useBoard();
  const [selectedCase,  setSelectedCase]  = useState<Case | null>(null);
  const [addingCase,    setAddingCase]    = useState(false);
  const [showActivity,  setShowActivity]  = useState(false);
  const [currentWeek,   setCurrentWeek]   = useState(() => getWeekStart());
  const [assigneeFilter,setAssigneeFilter]= useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<CaseStatus>('open');
  const [dragOverCol,   setDragOverCol]   = useState<CaseStatus | null>(null);

  const thisWeek = getWeekStart();

  const liveCase = selectedCase
    ? board.cases.find((c) => c.id === selectedCase.id) ?? null
    : null;

  const handleDrop = (status: CaseStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
    const caseId = e.dataTransfer.getData('text/plain');
    if (!caseId) return;
    const dragged = board.cases.find((c) => c.id === caseId);
    if (dragged && dragged.status !== status) void board.updateCase(caseId, { status });
  };

  if (board.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm">Loading board…</span>
        </div>
      </div>
    );
  }

  if (board.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-red-500">{board.error}</p>
      </div>
    );
  }

  if (!board.isMod) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10M4 6h16M4 6a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2M4 6V5a2 2 0 012-2h12a2 2 0 012 2v1" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Moderators only</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">This tool is restricted to subreddit moderators.</p>
        </div>
      </div>
    );
  }

  const weekCases = board.cases.filter((c) => c.sprintWeek === currentWeek);
  const visibleCases =
    assigneeFilter === null
      ? weekCases
      : assigneeFilter === UNASSIGNED
        ? weekCases.filter((c) => !c.assignedTo)
        : weekCases.filter((c) => c.assignedTo === assigneeFilter);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-2 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Mod-Sync</span>
          {board.username && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline truncate">· u/{board.username}</span>
          )}
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setCurrentWeek((w) => shiftWeek(w, -1))}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-1 px-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {formatWeekRange(currentWeek)}
            </span>
            {currentWeek === thisWeek && (
              <span className="hidden sm:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                This week
              </span>
            )}
          </div>
          <button
            onClick={() => setCurrentWeek((w) => shiftWeek(w, 1))}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {currentWeek !== thisWeek && (
            <button
              onClick={() => setCurrentWeek(thisWeek)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-0.5 whitespace-nowrap"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowActivity(true)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Activity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setAddingCase(true)}
            className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Case</span>
          </button>
        </div>
      </header>

      {/* ── Assignee filter ── */}
      {board.username && (
        <ModFilterBar
          allCases={board.cases}
          selected={assigneeFilter}
          currentUsername={board.username}
          onChange={setAssigneeFilter}
        />
      )}

      {/* ── Mobile: tab bar + single-column scroll ── */}
      <div className="flex-1 flex flex-col overflow-hidden sm:hidden">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex flex-shrink-0">
          {COLUMNS.map(({ status, label, dot }) => {
            const count = visibleCases.filter((c) => c.status === status).length;
            const isOver = dragOverCol === status;
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); setActiveTab(status); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                onDrop={(e) => handleDrop(status, e)}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  isOver
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                    : activeTab === status
                      ? 'border-indigo-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isOver ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : activeTab === status ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(() => {
            const cards = visibleCases.filter((c) => c.status === activeTab);
            return cards.length === 0
              ? <p className="text-xs text-gray-300 dark:text-gray-700 italic text-center py-10">No cases</p>
              : cards.map((c) => <KanbanCard key={c.id} case={c} onClick={setSelectedCase} />);
          })()}
        </div>
      </div>

      {/* ── Desktop: 3-column Kanban with dividers ── */}
      <main className="hidden sm:flex flex-1 overflow-hidden divide-x divide-gray-200 dark:divide-gray-800">
        {COLUMNS.map(({ status, label, dot, topBorder, hoverBg }) => {
          const cards = visibleCases.filter((c) => c.status === status);
          const isOver = dragOverCol === status;
          return (
            <div
              key={status}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(status); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
              onDrop={(e) => handleDrop(status, e)}
              className={`flex-1 flex flex-col overflow-hidden transition-colors ${isOver ? hoverBg : 'bg-white dark:bg-gray-900'}`}
            >
              {/* Column header */}
              <div className={`px-3 py-2 border-b border-gray-200 dark:border-gray-800 border-t-4 ${topBorder} flex items-center gap-2 flex-shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {cards.length === 0 ? (
                  <p className={`text-xs italic text-center py-6 transition-colors ${
                    isOver ? 'text-indigo-400 dark:text-indigo-500' : 'text-gray-300 dark:text-gray-700'
                  }`}>
                    {isOver ? 'Drop here' : 'No cases'}
                  </p>
                ) : (
                  cards.map((c) => <KanbanCard key={c.id} case={c} onClick={setSelectedCase} />)
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Modals ── */}
      {liveCase && board.username && (
        <CaseDetailModal
          case={liveCase}
          username={board.username}
          mods={board.mods}
          onUpdate={board.updateCase}
          onAddNote={board.addNote}
          onDelete={board.deleteCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
      {addingCase && board.username && (
        <NewCaseModal
          username={board.username}
          mods={board.mods}
          onSubmit={board.createCase}
          onClose={() => setAddingCase(false)}
        />
      )}
      {showActivity && (
        <ActivityDrawer
          entries={board.activity}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
