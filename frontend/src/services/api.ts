import { hc } from 'hono/client';
import type { AppType } from '@backend/index';

export const client = hc<AppType>('/');

export const api = client.api;
