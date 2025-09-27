export type Tag = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  display_name: string;
  twitter_username: string;
  avatar_url?: string;
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
  author: User;
  tags: Tag[];
};

