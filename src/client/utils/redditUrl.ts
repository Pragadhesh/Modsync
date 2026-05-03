export type ParsedRedditUrl = {
  type: 'post' | 'comment';
  subreddit: string;
  postId: string; // base36, no prefix
  commentId?: string;
  slug: string; // human-readable title slug from URL
};

export const parseRedditUrl = (input: string): ParsedRedditUrl | null => {
  let url: URL;
  try {
    // Accept bare URLs without protocol
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^old\./, '');
  if (host !== 'reddit.com' && host !== 'redd.it') return null;

  // redd.it/{id} short links
  if (host === 'redd.it') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (!id) return null;
    return { type: 'post', subreddit: '', postId: id, slug: '' };
  }

  // /r/{sub}/comments/{id}/{slug}/{commentId}
  const parts = url.pathname.split('/').filter(Boolean);
  const commentsIdx = parts.indexOf('comments');
  if (commentsIdx === -1 || parts[0] !== 'r') return null;

  const subreddit = parts[1] ?? '';
  const postId = parts[commentsIdx + 1] ?? '';
  const slug = decodeURIComponent(parts[commentsIdx + 2] ?? '').replace(/_/g, ' ');
  const commentId = parts[commentsIdx + 3];

  if (!postId) return null;

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
