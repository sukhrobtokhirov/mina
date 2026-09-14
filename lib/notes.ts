import { db, type Note } from "./db";
import { scheduleSync } from "./sync";

type NoteFields = Partial<
  Pick<Note, "title" | "content" | "preview" | "tag" | "deletedAt">
>;

export async function saveNoteFields(id: string, fields: NoteFields) {
  await db.notes.update(id, {
    ...fields,
    dirty: 1,
    updatedAt: Date.now(),
  });
  scheduleSync();
}

// Debounced saves are kept per note, so typing in another note never
// cancels the previous note's pending write.
const pending = new Map<string, { timer: number; fields: NoteFields }>();

export function queueNoteSave(id: string, fields: NoteFields, delay = 280) {
  const current = pending.get(id);
  window.clearTimeout(current?.timer);
  const merged = { ...current?.fields, ...fields };
  const timer = window.setTimeout(() => {
    pending.delete(id);
    void saveNoteFields(id, merged);
  }, delay);
  pending.set(id, { timer, fields: merged });
}

export function flushNoteSaves() {
  for (const [id, { timer, fields }] of pending) {
    window.clearTimeout(timer);
    void saveNoteFields(id, fields);
  }
  pending.clear();
}

export async function addNote(note: Note) {
  await db.notes.add(note);
  scheduleSync();
}

export async function softDeleteNote(id: string) {
  await saveNoteFields(id, { deletedAt: Date.now() });
}

export async function restoreNote(id: string) {
  await saveNoteFields(id, { deletedAt: null });
}

const textCache = new Map<string, { content: string; text: string }>();

// Plain text of the whole body, for search. The preview only holds the
// first 180 characters.
export function noteBodyText(note: Note) {
  const hit = textCache.get(note.id);
  if (hit && hit.content === note.content) return hit.text;

  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: unknown; content?: unknown };
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  try {
    walk(JSON.parse(note.content));
  } catch {
    parts.push(note.preview);
  }

  const text = parts.join(" ").toLowerCase();
  textCache.set(note.id, { content: note.content, text });
  return text;
}
