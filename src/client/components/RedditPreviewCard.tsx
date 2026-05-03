import { navigateTo } from '@devvit/web/client';
import type { RedditPreviewData } from '../../shared/api';
import type { ParsedRedditUrl } from '../utils/redditUrl';
import { redditPostUrl } from '../utils/redditUrl';

const openInNewTab = (url: string) => {
  // window.open is allowed by Devvit's sandbox when called from a user gesture.
  // Fall back to navigateTo (same-tab) only if the popup was blocked.
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) navigateTo(url);
};

const SnooIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="10" fill="#FF4500" />
    <path
      d="M16.67 10c0-.85-.7-1.54-1.56-1.54-.42 0-.8.17-1.08.43a7.67 7.67 0 00-4.05-1.27l.69-3.22 2.22.47a1.1 1.1 0 102.16-.1 1.1 1.1 0 00-1.05.76l-2.48-.53a.18.18 0 00-.21.13l-.77 3.6a7.7 7.7 0 00-4.03 1.27 1.54 1.54 0 10-1.7 2.48c-.02.14-.03.28-.03.42 0 2.15 2.5 3.89 5.6 3.89s5.6-1.74 5.6-3.89c0-.14-.01-.28-.03-.42.52-.28.88-.83.88-1.48zm-9.17 1c0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1-.6 0-1.1-.49-1.1-1.1zm6.15 2.9c-.76.75-2.2 1.02-3.65 1.02s-2.9-.27-3.65-1.02a.25.25 0 01.35-.35c.6.6 1.87.81 3.3.81s2.7-.21 3.3-.81a.25.25 0 01.35.35zm-.16-1.8c-.6 0-1.1-.49-1.1-1.1 0-.6.5-1.1 1.1-1.1.61 0 1.1.5 1.1 1.1 0 .61-.49 1.1-1.1 1.1z"
      fill="white"
    />
  </svg>
);

type Props = {
  parsedLink: ParsedRedditUrl;
  preview: RedditPreviewData | null;
  loading: boolean;
};

export const RedditPreviewCard = ({ parsedLink, preview, loading }: Props) => {
  const url = redditPostUrl(parsedLink);
  const subreddit = preview?.subreddit || parsedLink.subreddit;
  const title = preview?.title || parsedLink.slug || `Post ${parsedLink.postId}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openInNewTab(url);
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-orange-500 rounded-full animate-spin flex-shrink-0" />
          <span className="text-xs text-gray-400 dark:text-gray-500">Loading preview…</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group text-left"
        >
          <SnooIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {subreddit && (
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                  r/{subreddit}
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
        </button>
      )}
    </div>
  );
};
