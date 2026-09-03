import { db, isTag, type Note } from "./db";

export type ExportFile = {
  app: "my-notes";
  version: 1;
  exportedAt: number;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    preview: string;
    tag: Note["tag"];
    createdAt: number;
    updatedAt: number;
  }>;
};

export function isNoteRecord(value: unknown): value is {
  id: string;
  title: string;
  content: string;
  preview: string;
  tag: Note["tag"];
  createdAt: number;
  updatedAt: number;
} {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.title === "string" &&
    typeof n.content === "string" &&
    typeof n.preview === "string" &&
    isTag(n.tag) &&
    typeof n.createdAt === "number" &&
    typeof n.updatedAt === "number"
  );
}

export type ExportedNote = {
  id: string;
  title: string;
  content: string;
  preview: string;
  tag: Note["tag"];
  createdAt: number;
  updatedAt: number;
};

export function parseExport(raw: string): ExportedNote[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.filter(isNoteRecord);
  }
  if (parsed && typeof parsed === "object" && "notes" in parsed) {
    const notes = (parsed as { notes: unknown }).notes;
    if (Array.isArray(notes)) return notes.filter(isNoteRecord);
  }
  throw new Error("Invalid file");
}

export async function exportUserNotes(userId: string) {
  const all = await db.notes.where("userId").equals(userId).toArray();
  const payload: ExportFile = {
    app: "my-notes",
    version: 1,
    exportedAt: Date.now(),
    notes: all
      .filter((n) => !n.deletedAt)
      .map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        preview: n.preview,
        tag: n.tag,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
  };
  return payload;
}

export async function importUserNotes(userId: string, incoming: ExportedNote[]) {
  const existing = await db.notes.where("userId").equals(userId).toArray();
  const byId = new Map(existing.map((n) => [n.id, n]));
  const now = Date.now();
  const writes: Note[] = [];

  for (const row of incoming) {
    const current = byId.get(row.id);
    const next: Note = {
      id: row.id,
      userId,
      title: row.title,
      content: row.content,
      preview: row.preview,
      tag: row.tag,
      createdAt: row.createdAt,
      updatedAt: Math.max(row.updatedAt, now),
      deletedAt: null,
      dirty: 1,
      lastRemoteUpdatedAt: current?.lastRemoteUpdatedAt ?? 0,
    };

    if (!current || current.deletedAt) {
      writes.push(next);
      continue;
    }

    if (same(current, next)) {
      continue;
    }

    if (current.updatedAt > row.updatedAt && !same(current, next)) {
      writes.push({
        ...next,
        id: crypto.randomUUID(),
        title: `${(next.title.trim() || "Untitled")} (imported copy)`,
        createdAt: now,
        updatedAt: now,
        lastRemoteUpdatedAt: 0,
      });
      continue;
    }

    writes.push(next);
  }

  if (writes.length > 0) {
    await db.notes.bulkPut(writes);
  }

  return writes.length;
}

function same(a: Note, b: Pick<Note, "title" | "content" | "tag">) {
  return a.title === b.title && a.content === b.content && a.tag === b.tag;
}
