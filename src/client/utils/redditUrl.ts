export type ParsedRedditUrl = {
  type: 'post' | 'comment';
  subreddit: string;
  postId: string; // base36, no prefix
  commentId?: string;
  slug: string;
};

export const parseRedditUrl = (input: string): ParsedRedditUrl | null => {
  if (!input || !input.trim()) return null;
  let url: URL;
  try {
    const raw = input.trim();
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname
    .replace(/^www\./, '')
    .replace(/^old\./, '')
    .replace(/^m\./, '');

  // redd.it/{id} short links
  if (host === 'redd.it') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (!id) return null;
    return { type: 'post', subreddit: '', postId: id, slug: '' };
  }

  if (host !== 'reddit.com') return null;

  // /r/{sub}/comments/{id}/{slug}/{commentId}
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'r') return null;

  const commentsIdx = parts.indexOf('comments');
  if (commentsIdx === -1) return null;

  const subreddit = parts[1] ?? '';
  const postId = parts[commentsIdx + 1] ?? '';
  if (!postId) return null;

  const slug = decodeURIComponent(parts[commentsIdx + 2] ?? '').replace(/_/g, ' ');
  const commentId = parts[commentsIdx + 3];

  return {
    type: commentId ? 'comment' : 'post',
    subreddit,
    postId,
    ...(commentId ? { commentId } : {}),
    slug,
  };
};

export const redditPostUrl = (parsed: ParsedRedditUrl): string =>
  parsed.subreddit
    ? `https://www.reddit.com/r/${parsed.subreddit}/comments/${parsed.postId}/`
    : `https://redd.it/${parsed.postId}`;
