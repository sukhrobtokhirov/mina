import type { Tag } from "./db";

export type RemoteNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  preview: string;
  tag: Tag;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
