import { useState } from 'react';
import type { CaseFlag } from '../../shared/api';

const ESTIMATE_PRESETS = ['30m', '1h', '2h', '4h', '1d', '3d'];

type Props = {
  username: string;
  mods: string[];
  onSubmit: (title: string, description: string, flags: CaseFlag[], assignedTo: string | null, estimate: string | null) => Promise<void>;
  onClose: () => void;
};

export const NewCaseModal = ({ username, mods, onSubmit, onClose }: Props) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flags, setFlags] = useState<CaseFlag[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>(username);
  const [estimate, setEstimate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Deduplicate: current user first, then other mods alphabetically
  const modOptions = [
    username,
    ...mods.filter((m) => m !== username).sort(),
  ];

  const toggleFlag = (flag: CaseFlag) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const submit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(title.trim(), description.trim(), flags, assignedTo || null, estimate.trim() || null);
      onClose();
    } catch {
      setError('Failed to create case');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Case</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
              placeholder="Briefly describe the issue…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          {/* Assignee dropdown */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Assignee
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
            >
              <option value="">Unassigned</option>
              {modOptions.map((mod) => (
                <option key={mod} value={mod}>
                  u/{mod}{mod === username ? ' (me)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Estimate */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Estimate
            </label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
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

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
              rows={3}
              placeholder="Context, links, relevant details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Flags */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Flags
            </label>
            <div className="flex gap-2">
              {(['urgent', 'sensitive'] as CaseFlag[]).map((flag) => {
                const active = flags.includes(flag);
                const colors = flag === 'urgent'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800';
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
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

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Creating…' : 'Create Case'}
          </button>
        </div>
      </div>
    </div>
  );
};
