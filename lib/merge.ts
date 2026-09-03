import { type Note, isTag } from "./db";
import type { RemoteNote } from "./types";

export function fromRemote(row: RemoteNote): Note {
  const updatedAt = Date.parse(row.updated_at);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    preview: row.preview,
    tag: isTag(row.tag) ? row.tag : "journal",
    createdAt: Date.parse(row.created_at),
    updatedAt,
    deletedAt: row.deleted_at ? Date.parse(row.deleted_at) : null,
    dirty: 0,
    lastRemoteUpdatedAt: updatedAt,
  };
}

export function toRemote(note: Note) {
  return {
    id: note.id,
    user_id: note.userId,
    title: note.title,
    content: note.content,
    preview: note.preview,
    tag: note.tag,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
    deleted_at: note.deletedAt ? new Date(note.deletedAt).toISOString() : null,
  };
}

export function sameVisibleContent(a: Note, b: Note) {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.tag === b.tag &&
    Boolean(a.deletedAt) === Boolean(b.deletedAt)
  );
}

export function forkRemoteCopy(remote: Note, now: number): Note {
  const base = remote.title.trim() || "Untitled";
  return {
    ...remote,
    id: crypto.randomUUID(),
    title: `${base} (other copy)`,
    createdAt: now,
    updatedAt: now,
    dirty: 1,
    lastRemoteUpdatedAt: 0,
    deletedAt: null,
  };
}

export function mergeRemote(
  local: Note[],
  remote: RemoteNote[],
  now: number,
): { upserts: Note[]; forks: Note[] } {
  const upserts: Note[] = [];
  const forks: Note[] = [];
  const localById = new Map(local.map((n) => [n.id, n]));
  const remoteIds = new Set(remote.map((r) => r.id));

  for (const row of remote) {
    const incoming = fromRemote(row);
    const current = localById.get(row.id);

    if (!current) {
      upserts.push(incoming);
      continue;
    }

    if (!current.dirty) {
      upserts.push(incoming);
      continue;
    }

    if (sameVisibleContent(current, incoming)) {
      upserts.push({
        ...current,
        dirty: 0,
        lastRemoteUpdatedAt: incoming.updatedAt,
        deletedAt: incoming.deletedAt,
      });
      continue;
    }

    const remoteChangedSincePull =
      incoming.updatedAt > current.lastRemoteUpdatedAt;

    if (!remoteChangedSincePull) {
      upserts.push(current);
      continue;
    }

    if (incoming.updatedAt > current.updatedAt) {
      forks.push(forkRemoteCopy(current, now));
      upserts.push(incoming);
      continue;
    }

    forks.push(forkRemoteCopy(incoming, now));
    upserts.push(current);
  }

  for (const current of local) {
    if (remoteIds.has(current.id)) continue;
    if (current.dirty) continue;
    if (current.lastRemoteUpdatedAt > 0 && !current.deletedAt) {
      upserts.push({
        ...current,
        deletedAt: now,
        updatedAt: now,
        dirty: 1,
      });
    }
  }

  return { upserts, forks };
}
