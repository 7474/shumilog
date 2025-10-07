export type Tag = {
  id: string;
  name: string;
  description?: string;
  metadata?: object;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  display_name: string;
  twitter_username: string;
  avatar_url?: string;
  created_at: string;
};

export type LogImage = {
  id: string;
  log_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
  width?: number;
  height?: number;
  display_order: number;
  created_at: string;
};

export type Log = {
  id: string;
  title: string | null;
  content_md: string;
  is_public: boolean;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
  user: User;
  tags: Tag[];
  images?: LogImage[];
};
