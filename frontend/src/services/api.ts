import { hc } from 'hono/client';
import type { AppType } from '@backend/index';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
export const client = hc<AppType>(baseUrl, {
  init: {
    credentials: 'include',
  },
});

// The backend already mounts routes at /api, so we use the root client directly
export const api = client;
