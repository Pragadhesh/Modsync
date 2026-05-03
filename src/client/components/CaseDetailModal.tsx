import { useState } from 'react';
import type { Case, CaseFlag, CaseStatus } from '../../shared/api';
import { timeAgo, shiftWeek, formatWeekRange, getWeekStart } from '../utils/time';
import { ALL_FLAGS, FLAG_META } from '../utils/flags';
import { AssigneePicker } from './AssigneePicker';
import { RedditPreviewCard } from './RedditPreviewCard';
import { useRedditPreview } from '../hooks/useRedditPreview';

const ESTIMATE_PRESETS = ['30m', '1h', '2h', '4h', '1d', '3d'];

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
  case: Case;
  username: string;
  mods: string[];
  onUpdate: (id: string, updates: { title?: string; description?: string; status?: CaseStatus; flags?: CaseFlag[]; assignedTo?: string | null; estimate?: string | null; sprintWeek?: string; linkedUrl?: string | null }) => Promise<void>;
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

export const CaseDetailModal = ({ case: c, username, mods, onUpdate, onAddNote, onDelete, onClose }: Props) => {
  const [title, setTitle] = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [estimate, setEstimate] = useState(c.estimate ?? '');
  const [localStatus, setLocalStatus]     = useState<CaseStatus>(c.status);
  const [localAssignee, setLocalAssignee] = useState<string>(c.assignedTo ?? '');
  const [localFlag, setLocalFlag]         = useState<CaseFlag | null>(c.flags[0] ?? null);
  const [linkedUrl, setLinkedUrl]         = useState(c.linkedUrl ?? '');
  const [editingUrl, setEditingUrl]       = useState(!c.linkedUrl);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { parsedLink, preview, loading: previewLoading } = useRedditPreview(linkedUrl);

  const titleDirty    = title !== c.title;
  const descDirty     = description !== c.description;
  const estimateDirty = estimate !== (c.estimate ?? '');
  const statusDirty   = localStatus !== c.status;
  const assigneeDirty = localAssignee !== (c.assignedTo ?? '');
  const flagDirty     = localFlag !== (c.flags[0] ?? null);
  const urlDirty      = linkedUrl !== (c.linkedUrl ?? '');
  const isDirty       = titleDirty || descDirty || estimateDirty || statusDirty || assigneeDirty || flagDirty || urlDirty;

  const save = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onUpdate(c.id, {
        ...(titleDirty    && { title }),
        ...(descDirty     && { description }),
        ...(estimateDirty && { estimate: estimate.trim() || null }),
        ...(statusDirty   && { status: localStatus }),
        ...(assigneeDirty && { assignedTo: localAssignee || null }),
        ...(flagDirty     && { flags: localFlag ? [localFlag] : [] }),
        ...(urlDirty      && { linkedUrl: linkedUrl.trim() || null }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (flag: CaseFlag) => {
    setLocalFlag((prev) => (prev === flag ? null : flag));
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try { await onAddNote(c.id, commentText.trim()); setCommentText(''); }
    finally { setAddingComment(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(c.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
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
            u/{c.createdBy} · {timeAgo(c.createdAt)}
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

          {/* Linked Reddit Post */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Linked Reddit Post</label>
              {!editingUrl && (
                <button
                  type="button"
                  onClick={() => setEditingUrl(true)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {linkedUrl ? 'Edit' : '+ Add link'}
                </button>
              )}
            </div>

            {editingUrl ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="10" cy="10" r="10" fill="#FF4500" />
                      <path d="M16.67 10c0-.85-.7-1.54-1.56-1.54-.42 0-.8.17-1.08.43a7.67 7.67 0 00-4.05-1.27l.69-3.22 2.22.47a1.1 1.1 0 102.16-.1 1.1 1.1 0 00-1.05.76l-2.48-.53a.18.18 0 00-.21.13l-.77 3.6a7.7 7.7 0 00-4.03 1.27 1.54 1.54 0 10-1.7 2.48c-.02.14-.03.28-.03.42 0 2.15 2.5 3.89 5.6 3.89s5.6-1.74 5.6-3.89c0-.14-.01-.28-.03-.42.52-.28.88-.83.88-1.48zm-9.17 1c0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1-.6 0-1.1-.49-1.1-1.1zm6.15 2.9c-.76.75-2.2 1.02-3.65 1.02s-2.9-.27-3.65-1.02a.25.25 0 01.35-.35c.6.6 1.87.81 3.3.81s2.7-.21 3.3-.81a.25.25 0 01.35.35zm-.16-1.8c-.6 0-1.1-.49-1.1-1.1 0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1z" fill="white"/>
                    </svg>
                  </span>
                  <input
                    autoFocus
                    disabled={saving}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
                    placeholder="https://reddit.com/r/…"
                    value={linkedUrl}
                    onChange={(e) => setLinkedUrl(e.target.value)}
                  />
                </div>
                {linkedUrl && (
                  <button
                    type="button"
                    onClick={() => { setLinkedUrl(''); setEditingUrl(false); }}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    Remove link
                  </button>
                )}
                {parsedLink && (
                  <button type="button" onClick={() => setEditingUrl(false)} className="text-[10px] text-indigo-500 hover:text-indigo-700 ml-3">
                    Done
                  </button>
                )}
              </div>
            ) : null}

            {/* Preview card */}
            {parsedLink ? (
              <div className={editingUrl ? 'mt-2' : ''}>
                <RedditPreviewCard parsedLink={parsedLink} preview={preview} loading={previewLoading} />
              </div>
            ) : (!editingUrl && (
              <p className="text-xs text-gray-300 dark:text-gray-600 italic">No linked post</p>
            ))}
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
                  onClick={() => setLocalStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                    localStatus === s
                      ? `${STATUS_COLORS[s]} border-transparent`
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Flags</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_FLAGS.map((flag) => {
                const meta = FLAG_META[flag];
                return (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                      localFlag === flag ? meta.toggleColors : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {meta.label}
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

          {/* Assignee picker */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Assigned to</label>
            <AssigneePicker
              value={localAssignee}
              mods={mods}
              currentUsername={username}
              onChange={setLocalAssignee}
              disabled={saving}
            />
          </div>

          {/* ── Comments (Jira-style) ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 block">
              Comments {c.notes.length > 0 && `(${c.notes.length})`}
            </label>

            {/* Comment thread — oldest first */}
            {c.notes.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic mb-3">No comments yet</p>
            ) : (
              <div className="space-y-4 mb-4">
                {c.notes.map((note) => {
                  const color = avatarColor(note.author);
                  return (
                    <div key={note.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5`}>
                        {note.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">u/{note.author}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(note.createdAt)}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {note.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment box */}
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${avatarColor(username)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5`}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  rows={2}
                  placeholder="Add a comment… (Ctrl+Enter to submit)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && submitComment()}
                />
                {commentText.trim() && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={submitComment}
                      disabled={addingComment}
                      className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
                    >
                      {addingComment ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setCommentText('')}
                      className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer: delete left · save right ── */}
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between gap-3">
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
