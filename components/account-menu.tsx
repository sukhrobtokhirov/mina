"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { stopSync } from "@/lib/sync";
import { useAuth } from "@/lib/auth";

export function AccountMenu() {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) return null;

  async function signOut() {
    stopSync();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-[10rem] truncate text-[12px] text-muted sm:inline">
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
        aria-label="Sign out"
        title="Sign out"
      >
        <SignOut size={16} />
      </button>
    </div>
  );
}
