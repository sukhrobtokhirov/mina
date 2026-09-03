"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ThemeToggle } from "./theme-toggle";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[26rem] flex-col justify-center px-6">
        <p className="text-[1.5rem] font-semibold tracking-tight">Notes</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
          .env.local, then run the SQL in supabase/migrations/001_notes.sql.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signError) throw signError;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error: signError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signError) throw signError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo("Check your email to confirm the account.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[26rem] flex-col justify-center px-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <p className="text-[1.5rem] font-semibold tracking-tight">Notes</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Sign in to write. Notes stay private to your account and sync across
        devices.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink/30"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Password</span>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-lg border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink/30"
          />
        </label>
        {error ? (
          <p className="text-[13px] text-[#8f3d2c] dark:text-[#e09a88]">{error}</p>
        ) : null}
        {info ? <p className="text-[13px] text-muted">{info}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-ink text-[14px] font-medium text-surface transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending
            ? "Please wait"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
      <button
        type="button"
        className="mt-5 self-start text-[13px] text-muted hover:text-ink"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "signin" ? "Need an account?" : "Have an account?"}
      </button>
    </div>
  );
}
