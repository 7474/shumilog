const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787/api';

export type Tag = {
  id: string;
  name: string;
};

export type Author = {
  id: string;
  display_name: string;
  twitter_username: string;
};

export type LogItem = {
  id: string;
  title: string;
  excerpt?: string;
  content_md?: string;
  created_at: string;
  tags: Tag[];
  author: Author;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type FetchPublicLogsParams = {
  tagIds?: string[];
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

type ShareLogParams = {
  message: string;
};

const toCommaSeparated = (values?: string[]): string | undefined => {
  if (!values || values.length === 0) {
    return undefined;
  }
  return values.join(',');
};

const resolveError = async (response: Response): Promise<ApiError> => {
  let details: Record<string, unknown> | undefined;
  let message = `Request failed with status ${response.status}`;

  try {
    const parsed = (await response.json()) as Record<string, unknown>;
    details = parsed;
    const candidate = parsed.error ?? parsed.message;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      message = candidate;
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to default message
    if (error instanceof Error) {
      console.debug('No JSON error payload available', error.message);
    }
  }

  return new ApiError(response.status, message, details);
};

export const fetchPublicLogs = async (
  params: FetchPublicLogsParams = {},
): Promise<PaginatedResponse<LogItem>> => {
  const url = new URL(`${API_BASE_URL}/logs`);

  const tagIds = toCommaSeparated(params.tagIds);
  if (tagIds) {
    url.searchParams.set('tag_ids', tagIds);
  }
  if (typeof params.limit === 'number') {
    url.searchParams.set('limit', String(params.limit));
  }
  if (typeof params.offset === 'number') {
    url.searchParams.set('offset', String(params.offset));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    signal: params.signal,
  });

  if (!response.ok) {
    throw await resolveError(response);
  }

  return (await response.json()) as PaginatedResponse<LogItem>;
};

export const shareLog = async (
  logId: string,
  payload: ShareLogParams,
): Promise<{ twitter_post_id?: string }> => {
  const response = await fetch(`${API_BASE_URL}/logs/${logId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await resolveError(response);
  }

  return (await response.json()) as { twitter_post_id?: string };
};
