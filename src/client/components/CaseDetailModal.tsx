import { useState } from 'react';
import type { Case, CaseFlag, CaseStatus } from '../../shared/api';
import { timeAgo, shiftWeek, formatWeekRange, getWeekStart } from '../utils/time';

const ESTIMATE_PRESETS = ['30m', '1h', '2h', '4h', '1d', '3d'];

type Props = {
  case: Case;
  username: string;
  onUpdate: (id: string, updates: { title?: string; description?: string; status?: CaseStatus; flags?: CaseFlag[]; assignedTo?: string | null; estimate?: string | null; sprintWeek?: string }) => Promise<void>;
  onAddNote: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

export const CaseDetailModal = ({ case: c, username, onUpdate, onAddNote, onDelete, onClose }: Props) => {
  const [title, setTitle] = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [estimate, setEstimate] = useState(c.estimate ?? '');
  const [localStatus, setLocalStatus] = useState<CaseStatus>(c.status);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignInput, setAssignInput] = useState('');
  const [showAssignInput, setShowAssignInput] = useState(false);

  const titleDirty    = title !== c.title;
  const descDirty     = description !== c.description;
  const estimateDirty = estimate !== (c.estimate ?? '');
  const statusDirty   = localStatus !== c.status;
  const isDirty       = titleDirty || descDirty || estimateDirty || statusDirty;

  const save = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onUpdate(c.id, {
        ...(titleDirty    && { title }),
        ...(descDirty     && { description }),
        ...(estimateDirty && { estimate: estimate.trim() || null }),
        ...(statusDirty   && { status: localStatus }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (flag: CaseFlag) => {
    const flags = c.flags.includes(flag)
      ? c.flags.filter((f) => f !== flag)
      : [...c.flags, flag];
    setSaving(true);
    try { await onUpdate(c.id, { flags }); }
    finally { setSaving(false); }
  };

  const assignToMe = async () => {
    setSaving(true);
    try { await onUpdate(c.id, { assignedTo: username }); }
    finally { setSaving(false); }
  };

  const assignTo = async () => {
    if (!assignInput.trim()) return;
    setSaving(true);
    try {
      await onUpdate(c.id, { assignedTo: assignInput.trim() });
      setAssignInput('');
      setShowAssignInput(false);
    } finally { setSaving(false); }
  };

  const unassign = async () => {
    setSaving(true);
    try { await onUpdate(c.id, { assignedTo: null }); }
    finally { setSaving(false); }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try { await onAddNote(c.id, noteText); setNoteText(''); }
    finally { setAddingNote(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(c.id);
    onClose();
  };

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      {/* ── Modal panel ── */}
      <div
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[localStatus]}`}>
            {STATUS_LABELS[localStatus]}
            {statusDirty && <span className="ml-1 opacity-60">*</span>}
          </span>
          <span className="flex-1" />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Created by u/{c.createdBy} · {timeAgo(c.createdAt)}
          </span>
          <button
            onClick={onClose}
            className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

          {/* Title */}
          <input
            className="w-full text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none pb-1 transition-colors"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Case title"
          />

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Description</label>
            <textarea
              className="w-full text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-indigo-400 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context or details…"
            />
          </div>

          {/* Estimate */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Estimate</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
              placeholder="e.g. 2h, 1d, 30m"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ESTIMATE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEstimate(estimate === p ? '' : p)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                    estimate === p
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setLocalStatus(s as CaseStatus)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                    localStatus === s
                      ? `${STATUS_COLORS[s as CaseStatus]} border-transparent`
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {STATUS_LABELS[s as CaseStatus]}
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Flags</label>
            <div className="flex gap-2 flex-wrap">
              {(['urgent', 'sensitive'] as CaseFlag[]).map((flag) => {
                const active = c.flags.includes(flag);
                const colors = flag === 'urgent'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800';
                return (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    disabled={saving}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all capitalize ${
                      active ? colors : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sprint week */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Sprint week</label>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-700 dark:text-gray-300">{formatWeekRange(c.sprintWeek)}</span>
              <button
                onClick={async () => {
                  setSaving(true);
                  try { await onUpdate(c.id, { sprintWeek: shiftWeek(c.sprintWeek, 1) }); }
                  finally { setSaving(false); }
                }}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Move to next week
              </button>
              {c.sprintWeek !== getWeekStart() && (
                <button
                  onClick={async () => {
                    setSaving(true);
                    try { await onUpdate(c.id, { sprintWeek: getWeekStart() }); }
                    finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  Move to this week
                </button>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Assigned to</label>
            {c.assignedTo ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                  {c.assignedTo.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">u/{c.assignedTo}</span>
                {c.assignedTo !== username && (
                  <button onClick={assignToMe} disabled={saving} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Take over
                  </button>
                )}
                <button onClick={unassign} disabled={saving} className="text-xs text-gray-400 hover:text-red-500">
                  Unassign
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={assignToMe}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  Assign to me
                </button>
                {showAssignInput ? (
                  <div className="flex gap-1">
                    <input
                      className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 w-32"
                      placeholder="username"
                      value={assignInput}
                      onChange={(e) => setAssignInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && assignTo()}
                      autoFocus
                    />
                    <button onClick={assignTo} disabled={saving} className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                      Assign
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowAssignInput(true)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    Assign to someone else
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Notes {c.notes.length > 0 && `(${c.notes.length})`}
            </label>
            <div className="space-y-2 mb-3">
              {c.notes.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-600 italic">No notes yet</p>
              )}
              {[...c.notes].reverse().map((note) => (
                <div key={note.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.text}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    u/{note.author} · {timeAgo(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 focus:outline-none focus:border-indigo-400 resize-none text-gray-700 dark:text-gray-300"
                rows={2}
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && submitNote()}
              />
              <button
                onClick={submitNote}
                disabled={addingNote || !noteText.trim()}
                className="px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors text-sm self-end py-2"
              >
                {addingNote ? '…' : 'Add'}
              </button>
            </div>
          </div>

        </div>

        {/* ── Footer: delete left · save right ── */}
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Delete this case?</span>
              <button onClick={handleDelete} className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400">
              Delete case
            </button>
          )}

          {/* Save */}
          {isDirty && (
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
