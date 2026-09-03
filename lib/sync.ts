import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { db, type Note } from "./db";
import { mergeRemote, toRemote } from "./merge";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/env";
import type { RemoteNote } from "./types";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncState = {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflicts: number;
};

const listeners = new Set<(state: SyncState) => void>();

let state: SyncState = {
  status: "idle",
  lastSyncedAt: null,
  error: null,
  conflicts: 0,
};

let timer: number | undefined;
let heartbeat: number | undefined;
let inflight: Promise<void> | null = null;
let queued = false;
let channel: RealtimeChannel | null = null;
let currentUserId: string | null = null;

export function getSyncState() {
  return state;
}

export function subscribeSync(listener: (state: SyncState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
}

export function scheduleSync() {
  if (typeof window === "undefined") return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void runSync();
  }, 700);
}

export async function runSync() {
  if (inflight) {
    queued = true;
    return inflight;
  }

  inflight = (async () => {
    try {
      await syncOnce();
    } finally {
      inflight = null;
      if (queued) {
        queued = false;
        await runSync();
      }
    }
  })();

  return inflight;
}

async function syncOnce() {
  if (!isSupabaseConfigured()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState({ status: "offline", error: null });
    return;
  }
  if (!currentUserId) return;

  setState({ status: "syncing", error: null });

  try {
    const supabase = createClient();
    const userId = currentUserId;

    await db.notes.where("userId").equals("").modify((row) => {
      row.userId = userId;
      row.dirty = 1;
    });

    const { data, error } = await supabase
      .from("notes")
      .select(
        "id, user_id, title, content, preview, tag, created_at, updated_at, deleted_at",
      )
      .eq("user_id", userId);

    if (error) throw error;

    const remote = (data ?? []) as RemoteNote[];
    const local = await db.notes.where("userId").equals(userId).toArray();
    const { upserts, forks } = mergeRemote(local, remote, Date.now());

    if (upserts.length > 0) await db.notes.bulkPut(upserts);
    if (forks.length > 0) await db.notes.bulkPut(forks);

    const dirty = await db.notes
      .where("userId")
      .equals(userId)
      .filter((n) => n.dirty === 1)
      .toArray();

    for (const note of dirty) {
      await pushNote(note);
    }

    setState({
      status: "idle",
      lastSyncedAt: Date.now(),
      error: null,
      conflicts: forks.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    setState({
      status: navigator.onLine ? "error" : "offline",
      error: message,
    });
  }
}

async function pushNote(note: Note) {
  const supabase = createClient();
  let payload = toRemote(note);

  let { error } = await supabase.from("notes").upsert(payload, {
    onConflict: "id",
  });

  if (error?.code === "23505") {
    const copy: Note = {
      ...note,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      dirty: 1,
      lastRemoteUpdatedAt: 0,
    };
    await db.notes.delete(note.id);
    await db.notes.add(copy);
    payload = toRemote(copy);
    ({ error } = await supabase.from("notes").upsert(payload, { onConflict: "id" }));
    if (!error) {
      await db.notes.update(copy.id, {
        dirty: 0,
        lastRemoteUpdatedAt: copy.updatedAt,
      });
    }
    if (error) throw error;
    return;
  }

  if (error) throw error;

  await db.notes.update(note.id, {
    dirty: 0,
    lastRemoteUpdatedAt: note.updatedAt,
  });
}

export function startSyncForUser(user: User) {
  currentUserId = user.id;
  void runSync();

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("visibilitychange", onVisible);
    window.clearInterval(heartbeat);
    heartbeat = window.setInterval(() => {
      void runSync();
    }, 45_000);
  }

  if (!isSupabaseConfigured()) return;

  const supabase = createClient();
  void channel?.unsubscribe();
  channel = supabase
    .channel(`notes:${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        scheduleSync();
      },
    )
    .subscribe();
}

export function stopSync() {
  currentUserId = null;
  if (typeof window !== "undefined") {
    window.clearTimeout(timer);
    window.clearInterval(heartbeat);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("visibilitychange", onVisible);
  }
  if (channel) {
    void channel.unsubscribe();
    channel = null;
  }
  setState({ status: "idle", error: null, conflicts: 0 });
}

function onOnline() {
  void runSync();
}

function onVisible() {
  if (document.visibilityState === "visible") void runSync();
}
