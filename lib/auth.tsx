"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthValue = {
  user: User | null;
  ready: boolean;
  configured: boolean;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  ready: false,
  configured: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!active) return;
      setUser(data.user);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        setReady(true);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo(
    () => ({ user, ready, configured }),
    [user, ready, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
