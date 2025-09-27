import { useEffect, useMemo, useState } from 'react';

type Tag = {
  id: string;
  name: string;
};

type Author = {
  id: string;
  display_name: string;
  twitter_username: string;
};

type LogItem = {
  id: string;
  title: string;
  excerpt?: string;
  content_md?: string;
  created_at: string;
  tags: Tag[];
  author: Author;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
};

type ShareState = 'idle' | 'loading' | 'success' | 'error';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787/api';

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};

const extractTagMap = (logs: LogItem[]) => {
  const map = new Map<string, string>();
  logs.forEach((log) => {
    (log.tags ?? []).forEach((tag) => {
      map.set(tag.id, tag.name);
    });
  });
  return map;
};

export function App(): JSX.Element {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareState, setShareState] = useState<Record<string, ShareState>>({});

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = new URL(`${API_BASE_URL}/logs`);
        if (selectedTag !== 'all') {
          url.searchParams.set('tag_ids', selectedTag);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load logs (${response.status})`);
        }

        const payload = (await response.json()) as PaginatedResponse<LogItem>;
        if (cancelled) {
          return;
        }

        setLogs(payload.items);
        setTagMap((prev) => {
          const merged = new Map(prev);
          const incoming = extractTagMap(payload.items);
          incoming.forEach((name, id) => merged.set(id, name));
          return merged;
        });
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        console.error('Failed to load logs', err);
        setError('Failed to load logs. Please try again later.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedTag]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const tagOptions = useMemo(() => {
    const entries = Array.from(tagMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    return [{ id: 'all', name: 'All tags' }, ...entries.map(([id, name]) => ({ id, name }))];
  }, [tagMap]);

  const shareLabel = (state: ShareState, title: string) => {
    switch (state) {
      case 'loading':
        return `Sharing ${title}...`;
      case 'success':
        return `Shared ${title}`;
      case 'error':
        return `Retry share for ${title}`;
      default:
        return `Share ${title}`;
    }
  };

  const handleShare = async (log: LogItem) => {
    if (shareState[log.id] === 'loading') {
      return;
    }

  setShareState((prev) => ({ ...prev, [log.id]: 'loading' }));
  setToast('Sharing log...');

    try {
      const response = await fetch(`${API_BASE_URL}/logs/${log.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: `Sharing "${log.title}" via Shumilog!` }),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.error ?? `Failed to share log (${response.status})`);
      }

  setShareState((prev) => ({ ...prev, [log.id]: 'success' }));
  setToast('Log shared successfully.');
    } catch (err) {
      console.error('Share failed', err);
  setShareState((prev) => ({ ...prev, [log.id]: 'error' }));
  setToast('Unable to share log. Please try again.');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Shumilog</h1>
        <p>Discover and share community content logs.</p>
      </header>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            backgroundColor: '#e8f4ff',
            color: '#0f172a',
          }}
        >
          {toast}
        </div>
      ) : null}

      <main className="main-content">
        <section style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="tag-filter" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Filter by tag
          </label>
          <select
            id="tag-filter"
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
              minWidth: '220px',
            }}
          >
            {tagOptions.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </section>

        <section style={{ display: 'grid', gap: '1.5rem' }}>
          {isLoading ? (
            <p>Loading logs...</p>
          ) : error ? (
            <p role="alert" style={{ color: '#b00020' }}>
              {error}
            </p>
          ) : logs.length === 0 ? (
            <p>No logs found for this filter.</p>
          ) : (
            logs.map((log) => {
              const state = shareState[log.id] ?? 'idle';
              const body = log.excerpt ?? log.content_md ?? 'No summary available yet.';
              return (
                <article
                  key={log.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1.5rem',
                    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <header style={{ marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>{log.title}</h2>
                    <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                      {log.author.display_name} (@{log.author.twitter_username}) · {formatDate(log.created_at)}
                    </p>
                  </header>

                  <p style={{ marginBottom: '1rem', color: '#1f2937' }}>{body}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {log.tags.map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          backgroundColor: '#f1f5f9',
                          fontSize: '0.85rem',
                        }}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleShare(log)}
                    disabled={state === 'loading'}
                  >
                    {shareLabel(state, log.title)}
                  </button>

                  {state === 'success' ? (
                    <p style={{ marginTop: '0.5rem', color: '#15803d' }}>Shared to Twitter!</p>
                  ) : null}

                  {state === 'error' ? (
                    <p style={{ marginTop: '0.5rem', color: '#b91c1c' }}>Share failed. Try again.</p>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </main>

      <footer className="footer">
        <small>Shumilog &copy; {new Date().getFullYear()}</small>
      </footer>
    </div>
  );
}

export default App;
