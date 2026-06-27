"use client";

import { useEffect, useState } from "react";
import { CrisisWorkspace } from "@/components/crisis/CrisisWorkspace";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAuthStore } from "@/lib/store/authStore";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function CrisisPage() {
  const fallbackToken = useAuthStore((s) => s.accessToken);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadToken() {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? fallbackToken);
      setReady(true);
    }
    loadToken();
  }, [fallbackToken]);

  return (
    <div className="aa-stagger" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {!ready || !token ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonLoader className="h-16 w-full" />
          <SkeletonLoader className="h-64 w-full" />
        </div>
      ) : (
        <CrisisWorkspace token={token} />
      )}
    </div>
  );
}
