"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131313] px-4 py-6 md:px-8 md:py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[#353534] bg-[#1f1f1f] p-6 text-center shadow-card">
        <h1 className="font-headline text-3xl font-bold text-[#fff2de]">Something went wrong</h1>
        <p className="mt-3 text-sm text-[#cec5b9]">{error.message || "An unexpected error occurred in AlmondAI."}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
