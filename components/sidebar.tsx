"use client";

import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { formatUpdated, tagLabel, type Note, type Tag } from "@/lib/db";

type Props = {
  notes: Note[];
  activeId: string | null;
  query: string;
  tagFilter: Tag | "all";
  onQuery: (q: string) => void;
  onTagFilter: (tag: Tag | "all") => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export function Sidebar({
  notes,
  activeId,
  query,
  tagFilter,
  onQuery,
  onTagFilter,
  onSelect,
  onCreate,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-3">
        <p className="text-[15px] font-semibold tracking-tight text-ink">Notes</p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink px-2.5 text-[13px] font-medium text-surface transition-transform duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          <Plus size={14} weight="bold" />
          New
        </button>
      </div>

      <div className="px-3">
        <label className="relative block">
          <span className="sr-only">Search notes</span>
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-8 text-[13px] text-ink outline-none placeholder:text-muted focus:border-ink/30"
          />
        </label>
        <div className="mt-2 flex gap-1">
          {(["all", "journal", "work", "life"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTagFilter(t)}
              className={`h-7 rounded-md px-2 text-[12px] transition-colors ${
                tagFilter === t
                  ? "bg-ink text-surface"
                  : "text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              {t === "all" ? "All" : tagLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {notes.length === 0 ? (
          <p className="px-2 py-8 text-[13px] leading-relaxed text-muted">
            Nothing here yet. Write a note about the day, work, or whatever is
            sitting with you.
          </p>
        ) : (
          <ul className="flex flex-col">
            {notes.map((note) => {
              const active = note.id === activeId;
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(note.id)}
                    className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                      active ? "bg-raised" : "hover:bg-raised/70"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">
                        {note.title.trim() || "Untitled"}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatUpdated(note.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">
                      {note.preview || "Empty"}
                    </span>
                    <span className="mt-1.5 inline-block text-[10px] font-medium tracking-wide text-muted uppercase">
                      {tagLabel(note.tag)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
