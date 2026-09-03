"use client";

import { useEffect, useState } from "react";
import { getSyncState, subscribeSync, type SyncState } from "@/lib/sync";

export function SyncStatus() {
  const [state, setState] = useState<SyncState>(getSyncState);

  useEffect(() => subscribeSync(setState), []);

  const label =
    state.status === "syncing"
      ? "Syncing"
      : state.status === "offline"
        ? "Offline"
        : state.status === "error"
          ? "Sync failed"
          : state.lastSyncedAt
            ? "Synced"
            : "Saved locally";

  return (
    <p
      className="hidden text-[12px] text-muted sm:block"
      title={state.error ?? undefined}
    >
      {label}
      {state.conflicts > 0 ? " (kept both copies)" : ""}
    </p>
  );
}
