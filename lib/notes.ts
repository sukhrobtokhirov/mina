import { db, type Note } from "./db";
import { scheduleSync } from "./sync";

export async function saveNoteFields(
  id: string,
  fields: Partial<
    Pick<Note, "title" | "content" | "preview" | "tag" | "deletedAt">
  >,
) {
  await db.notes.update(id, {
    ...fields,
    dirty: 1,
    updatedAt: Date.now(),
  });
  scheduleSync();
}

export async function addNote(note: Note) {
  await db.notes.add(note);
  scheduleSync();
}

export async function softDeleteNote(id: string) {
  await saveNoteFields(id, { deletedAt: Date.now() });
}
