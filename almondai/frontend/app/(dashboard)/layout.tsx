"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/lib/hooks/useAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { bootstrapSession } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const session = await bootstrapSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    };

    void init();
  }, [bootstrapSession, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--aa-bg)] px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <SkeletonLoader className="h-10 w-72" />
          <SkeletonLoader className="h-40 w-full" />
          <SkeletonLoader className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
