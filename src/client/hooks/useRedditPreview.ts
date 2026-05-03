import { useState, useEffect, useRef } from 'react';
import type { RedditPreviewData } from '../../shared/api';
import { parseRedditUrl, type ParsedRedditUrl } from '../utils/redditUrl';

type Result = {
  parsedLink: ParsedRedditUrl | null;
  preview: RedditPreviewData | null;
  loading: boolean;
};

export const useRedditPreview = (url: string): Result => {
  const [parsedLink, setParsedLink] = useState<ParsedRedditUrl | null>(() => parseRedditUrl(url));
  const [preview, setPreview] = useState<RedditPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Initial fetch if url is pre-populated (e.g. editing existing case)
  useEffect(() => {
    const parsed = parseRedditUrl(url);
    if (!parsed) return;
    setLoading(true);
    void fetch(`/api/cases/reddit-preview?postId=${encodeURIComponent(parsed.postId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (mountedRef.current && data) setPreview(data as RedditPreviewData); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const parsed = parseRedditUrl(url);
    setParsedLink(parsed);
    setPreview(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!parsed) return;

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      void fetch(`/api/cases/reddit-preview?postId=${encodeURIComponent(parsed.postId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (mountedRef.current && data) setPreview(data as RedditPreviewData); })
        .catch(() => {})
        .finally(() => { if (mountedRef.current) setLoading(false); });
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  return { parsedLink, preview, loading };
};
