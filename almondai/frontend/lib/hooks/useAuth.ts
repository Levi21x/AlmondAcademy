"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

function parseSession(session: Session | null): { accessToken: string; userId: string; email: string } | null {
  if (!session?.access_token || !session.user?.id || !session.user.email) {
    return null;
  }
  return {
    accessToken: session.access_token,
    userId: session.user.id,
    email: session.user.email,
  };
}

export function useAuth() {
  const router = useRouter();
  const { setAuth, clearAuth } = useAuthStore();

  return useMemo(
    () => ({
      async bootstrapSession(): Promise<Session | null> {
        const supabaseClient = getSupabaseClient();
        const { data } = await supabaseClient.auth.getSession();
        const parsed = parseSession(data.session);
        if (parsed) {
          setAuth(parsed);
        }
        return data.session;
      },
      async signIn(email: string, password: string): Promise<Session> {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (!data.session) {
            throw new Error(error?.message ?? "Unable to sign in");
          }
        const parsed = parseSession(data.session);
        if (!parsed) {
          throw new Error("Invalid session data");
        }
        setAuth(parsed);
        return data.session;
      },
      async signUp(fullName: string, email: string, password: string): Promise<Session | null> {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) {
          throw new Error(error.message);
        }
        const parsed = parseSession(data.session);
        if (parsed) {
          setAuth(parsed);
        }
        return data.session;
      },
      async sendResetLink(email: string): Promise<void> {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) {
          throw new Error(error.message);
        }
      },
      async signOut(): Promise<void> {
        const supabaseClient = getSupabaseClient();
        await supabaseClient.auth.signOut();
        clearAuth();
        router.push("/login");
      },
    }),
    [clearAuth, router, setAuth],
  );
}
