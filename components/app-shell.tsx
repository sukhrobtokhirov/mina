"use client";

import { DownloadSimple, List, Trash, UploadSimple } from "@phosphor-icons/react";
import { liveQuery } from "dexie";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountMenu } from "./account-menu";
import { NoteBody } from "./note-body";
import { Sidebar } from "./sidebar";
import { SyncStatus } from "./sync-status";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/lib/auth";
import {
  db,
  emptyDoc,
  newNote,
  tagLabel,
  type Note,
  type Tag,
} from "@/lib/db";
import { exportUserNotes, importUserNotes, parseExport } from "@/lib/import-export";
import { addNote, saveNoteFields, softDeleteNote } from "@/lib/notes";
import { runSync, startSyncForUser, stopSync } from "@/lib/sync";

const SELECTED_KEY = "my-notes:selected";

export function AppShell() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<Tag | "all">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const titleTimer = useRef<number | undefined>(undefined);
  const bodyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) {
      stopSync();
      return;
    }
    startSyncForUser(user);
    return () => stopSync();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const sub = liveQuery(async () => {
      const rows = await db.notes.where("userId").equals(userId).toArray();
      return rows
        .filter((n) => !n.deletedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }).subscribe({
      next: setNotes,
      error: console.error,
    });
    return () => sub.unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!notes) return;
    const stored = localStorage.getItem(SELECTED_KEY);
    setActiveId((current) => {
      if (current && notes.some((n) => n.id === current)) return current;
      if (stored && notes.some((n) => n.id === stored)) return stored;
      return notes[0]?.id ?? null;
    });
  }, [notes]);

  useEffect(() => {
    if (activeId) localStorage.setItem(SELECTED_KEY, activeId);
  }, [activeId]);

  const filtered = useMemo(() => {
    if (!notes) return [];
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (tagFilter !== "all" && n.tag !== tagFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q)
      );
    });
  }, [notes, query, tagFilter]);

  const active = notes?.find((n) => n.id === activeId) ?? null;

  const createNote = useCallback(async () => {
    if (!user) return;
    const note = newNote(user.id, tagFilter === "all" ? "journal" : tagFilter);
    await addNote(note);
    setActiveId(note.id);
    setSidebarOpen(false);
  }, [tagFilter, user]);

  const removeNote = useCallback(async () => {
    if (!active) return;
    if (!window.confirm("Delete this note?")) return;
    await softDeleteNote(active.id);
  }, [active]);

  const saveTitle = useCallback((id: string, title: string) => {
    window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => {
      void saveNoteFields(id, { title });
    }, 280);
  }, []);

  const saveBody = useCallback((id: string, content: string, preview: string) => {
    window.clearTimeout(bodyTimer.current);
    bodyTimer.current = window.setTimeout(() => {
      void saveNoteFields(id, { content, preview });
    }, 280);
  }, []);

  const exportNotes = useCallback(async () => {
    if (!user) return;
    const payload = await exportUserNotes(user.id);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [user]);

  const importNotes = useCallback(
    async (file: File) => {
      if (!user) return;
      try {
        const text = await file.text();
        const incoming = parseExport(text);
        if (incoming.length === 0) {
          window.alert("No notes found in that file.");
          return;
        }
        const count = await importUserNotes(user.id, incoming);
        await runSync();
        window.alert(
          count === 0
            ? "Nothing new to import."
            : `Imported ${count} note${count === 1 ? "" : "s"}.`,
        );
      } catch {
        window.alert("Could not import that file.");
      }
    },
    [user],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void createNote();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote]);

  if (!ready || notes === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-[13px] text-muted">
        Loading notes
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-bg text-ink">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close notes list"
          className="fixed inset-0 z-20 bg-ink/25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[17.5rem] border-r border-line bg-sidebar transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          notes={filtered}
          activeId={activeId}
          query={query}
          tagFilter={tagFilter}
          onQuery={setQuery}
          onTagFilter={setTagFilter}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onCreate={() => void createNote()}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink lg:hidden"
              aria-label="Open notes list"
              onClick={() => setSidebarOpen(true)}
            >
              <List size={18} />
            </button>
            {active ? (
              <select
                aria-label="Note type"
                value={active.tag}
                onChange={(e) => {
                  void saveNoteFields(active.id, {
                    tag: e.target.value as Tag,
                  });
                }}
                className="h-8 rounded-lg border-0 bg-transparent pr-6 text-[13px] text-muted outline-none hover:text-ink"
              >
                {(["journal", "work", "life"] as const).map((t) => (
                  <option key={t} value={t}>
                    {tagLabel(t)}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SyncStatus />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void exportNotes()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
              aria-label="Export notes"
              title="Export"
            >
              <DownloadSimple size={16} />
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
              aria-label="Import notes"
              title="Import"
            >
              <UploadSimple size={16} />
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importNotes(file);
              }}
            />
            {active ? (
              <button
                type="button"
                onClick={() => void removeNote()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
                aria-label="Delete note"
              >
                <Trash size={16} />
              </button>
            ) : null}
            <AccountMenu />
          </div>
        </header>

        {active ? (
          <article
            key={active.id}
            className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col px-5 pt-8 pb-20 sm:px-8"
          >
            <input
              defaultValue={active.title}
              onChange={(e) => saveTitle(active.id, e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent text-[1.85rem] leading-[1.2] font-semibold tracking-tight text-ink outline-none placeholder:text-muted/70"
            />
            <NoteBody
              noteId={active.id}
              content={active.content || emptyDoc}
              onChange={(content, preview) =>
                saveBody(active.id, content, preview)
              }
            />
          </article>
        ) : (
          <div className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col justify-center px-6">
            <p className="text-[1.6rem] font-semibold tracking-tight">
              A quiet place to write
            </p>
            <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-muted">
              Feelings, work, the day. Private to you, synced when you are
              online. Export a JSON copy anytime.
            </p>
            <button
              type="button"
              onClick={() => void createNote()}
              className="mt-6 inline-flex h-10 w-fit items-center rounded-lg bg-ink px-4 text-[14px] font-medium text-surface transition-transform active:scale-[0.98]"
            >
              New note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
