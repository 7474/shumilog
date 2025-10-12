import createClient from 'openapi-fetch';
import type { paths } from '@/types/api';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

// OpenAPI型定義に基づく型安全なAPIクライアント
export const api = createClient<paths>({
  baseUrl,
  credentials: 'include',
});
