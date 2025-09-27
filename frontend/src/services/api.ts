import { hc } from 'hono/client';
import type { AppType } from '@backend/index';

const client = hc<AppType>('/');

export const api = client.api;
