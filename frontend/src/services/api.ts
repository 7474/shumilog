import { hc } from 'hono/client';
import type { AppType } from '@backend/index';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
export const client = hc<AppType>(baseUrl);

export const api = client.api;
