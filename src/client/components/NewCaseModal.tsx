import { useState, useEffect, useRef } from 'react';
import type { CaseFlag } from '../../shared/api';
import type { RedditPreviewData } from '../../shared/api';
import { ALL_FLAGS, FLAG_META } from '../utils/flags';
import { AssigneePicker } from './AssigneePicker';
import { CASE_TEMPLATES } from '../utils/templates';
import { parseRedditUrl, redditPostUrl } from '../utils/redditUrl';

const ESTIMATE_PRESETS = ['30m', '1h', '2h', '4h', '1d', '3d'];

type Props = {
  username: string;
  mods: string[];
  onSubmit: (title: string, description: string, flags: CaseFlag[], assignedTo: string | null, estimate: string | null, linkedUrl: string | null) => Promise<void>;
  onClose: () => void;
};

export const NewCaseModal = ({ username, mods, onSubmit, onClose }: Props) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flags, setFlags] = useState<CaseFlag[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [estimate, setEstimate] = useState('');
  const [linkedUrl, setLinkedUrl] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reddit preview state
  const [parsedLink, setParsedLink] = useState(parseRedditUrl(''));
  const [preview, setPreview] = useState<RedditPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parsed = parseRedditUrl(linkedUrl);
    setParsedLink(parsed);
    setPreview(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!parsed) return;
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/cases/reddit-preview?postId=${parsed.postId}`);
        if (res.ok) setPreview((await res.json()) as RedditPreviewData);
      } catch { /* silent */ }
      setPreviewLoading(false);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [linkedUrl]);

  const applyTemplate = (templateId: string) => {
    if (activeTemplate === templateId) {
      setActiveTemplate(null);
      return;
    }
    const tpl = CASE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplate(templateId);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setFlags(tpl.flag ? [tpl.flag] : []);
    setEstimate(tpl.estimate ?? '');
  };

  const toggleFlag = (flag: CaseFlag) => {
    setFlags((prev) => (prev.includes(flag) ? [] : [flag]));
    setActiveTemplate(null);
  };

  const submit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSubmit(title.trim(), description.trim(), flags, assignedTo || null, estimate.trim() || null, linkedUrl.trim() || null);
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

          {/* ── Templates ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Templates
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CASE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                    activeTemplate === tpl.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Title ── */}
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

          {/* ── Linked Reddit URL ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Linked Reddit Post
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="10" fill="#FF4500" />
                  <path d="M16.67 10c0-.85-.7-1.54-1.56-1.54-.42 0-.8.17-1.08.43a7.67 7.67 0 00-4.05-1.27l.69-3.22 2.22.47a1.1 1.1 0 102.16-.1 1.1 1.1 0 00-1.05.76l-2.48-.53a.18.18 0 00-.21.13l-.77 3.6a7.7 7.7 0 00-4.03 1.27 1.54 1.54 0 10-1.7 2.48c-.02.14-.03.28-.03.42 0 2.15 2.5 3.89 5.6 3.89s5.6-1.74 5.6-3.89c0-.14-.01-.28-.03-.42.52-.28.88-.83.88-1.48zm-9.17 1c0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1-.6 0-1.1-.49-1.1-1.1zm6.15 2.9c-.76.75-2.2 1.02-3.65 1.02s-2.9-.27-3.65-1.02a.25.25 0 01.35-.35c.6.6 1.87.81 3.3.81s2.7-.21 3.3-.81a.25.25 0 01.35.35zm-.16-1.8c-.6 0-1.1-.49-1.1-1.1 0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1z" fill="white"/>
                </svg>
              </span>
              <input
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
                placeholder="https://reddit.com/r/…"
                value={linkedUrl}
                onChange={(e) => setLinkedUrl(e.target.value)}
              />
            </div>

            {/* Preview card */}
            {parsedLink && (
              <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
                {previewLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
                    <span className="text-xs text-gray-400 dark:text-gray-500">Loading preview…</span>
                  </div>
                ) : (
                  <a
                    href={redditPostUrl(parsedLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="10" cy="10" r="10" fill="#FF4500" />
                      <path d="M16.67 10c0-.85-.7-1.54-1.56-1.54-.42 0-.8.17-1.08.43a7.67 7.67 0 00-4.05-1.27l.69-3.22 2.22.47a1.1 1.1 0 102.16-.1 1.1 1.1 0 00-1.05.76l-2.48-.53a.18.18 0 00-.21.13l-.77 3.6a7.7 7.7 0 00-4.03 1.27 1.54 1.54 0 10-1.7 2.48c-.02.14-.03.28-.03.42 0 2.15 2.5 3.89 5.6 3.89s5.6-1.74 5.6-3.89c0-.14-.01-.28-.03-.42.52-.28.88-.83.88-1.48zm-9.17 1c0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1-.6 0-1.1-.49-1.1-1.1zm6.15 2.9c-.76.75-2.2 1.02-3.65 1.02s-2.9-.27-3.65-1.02a.25.25 0 01.35-.35c.6.6 1.87.81 3.3.81s2.7-.21 3.3-.81a.25.25 0 01.35.35zm-.16-1.8c-.6 0-1.1-.49-1.1-1.1 0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1z" fill="white"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {preview?.title || (parsedLink.slug || `Post ${parsedLink.postId}`)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(preview?.subreddit || parsedLink.subreddit) && (
                          <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                            r/{preview?.subreddit || parsedLink.subreddit}
                          </span>
                        )}
                        {preview?.author && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            · u/{preview.author}
                          </span>
                        )}
                        {preview?.flair && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                            {preview.flair}
                          </span>
                        )}
                        {parsedLink.type === 'comment' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            comment
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Assignee ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Assignee
            </label>
            <AssigneePicker
              value={assignedTo}
              mods={mods}
              currentUsername={username}
              onChange={setAssignedTo}
            />
          </div>

          {/* ── Estimate ── */}
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

          {/* ── Description ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
              rows={4}
              placeholder="Context, links, relevant details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ── Flags ── */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
              Flags
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_FLAGS.map((flag) => {
                const active = flags.includes(flag);
                const meta = FLAG_META[flag];
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                      active ? meta.toggleColors : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="text-sm px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
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
