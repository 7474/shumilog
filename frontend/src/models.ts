export type Tag = {
  id: string;
  name: string;
};

export type Log = {
  id: string;
  content: string;
  createdAt: string;
  tags: Tag[];
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
};
