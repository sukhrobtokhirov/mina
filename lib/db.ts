import Dexie, { type EntityTable } from "dexie";

export const TAGS = ["journal", "work", "life"] as const;
export type Tag = (typeof TAGS)[number];

export type Note = {
  id: string;
  userId: string;
  title: string;
  content: string;
  preview: string;
  tag: Tag;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: 0 | 1;
  lastRemoteUpdatedAt: number;
};

export const db = new Dexie("my-notes") as Dexie & {
  notes: EntityTable<Note, "id">;
};

db.version(1).stores({
  notes: "id, updatedAt, tag, title",
});

db.version(2)
  .stores({
    notes: "id, userId, updatedAt, tag, title, dirty, deletedAt",
  })
  .upgrade(async (tx) => {
    await tx
      .table("notes")
      .toCollection()
      .modify((row: Partial<Note>) => {
        row.userId = row.userId ?? "";
        row.deletedAt = row.deletedAt ?? null;
        row.dirty = 1;
        row.lastRemoteUpdatedAt = row.lastRemoteUpdatedAt ?? 0;
      });
  });

export const emptyDoc = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export function newNote(userId: string, tag: Tag = "journal"): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    userId,
    title: "",
    content: emptyDoc,
    preview: "",
    tag,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
    lastRemoteUpdatedAt: 0,
  };
}

export function formatUpdated(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function tagLabel(tag: Tag) {
  if (tag === "journal") return "Journal";
  if (tag === "work") return "Work";
  return "Life";
}

export function isTag(value: unknown): value is Tag {
  return value === "journal" || value === "work" || value === "life";
}
