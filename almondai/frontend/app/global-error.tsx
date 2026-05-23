"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#131313] text-[#e5e2e1] antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-6 md:px-8 md:py-10">
          <div className="w-full max-w-xl rounded-2xl border border-[#353534] bg-[#1f1f1f] p-6 text-center shadow-card">
            <h1 className="font-headline text-3xl font-bold text-[#fff2de]">AlmondAI hit an unrecoverable error</h1>
            <p className="mt-3 text-sm text-[#cec5b9]">{error.message || "Please retry. If the issue persists, refresh the page."}</p>
            <div className="mt-6 flex justify-center">
              <Button onClick={reset}>Retry</Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
