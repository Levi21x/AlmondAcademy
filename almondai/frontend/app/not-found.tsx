import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131313] px-4 py-6 md:px-8 md:py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[#353534] bg-[#1f1f1f] p-6 text-center shadow-card">
        <p className="text-6xl font-bold tracking-tight text-[#d5c5a8]">404</p>
        <h1 className="font-headline mt-2 text-3xl font-bold text-[#fff2de]">Page not found</h1>
        <p className="mt-3 text-sm text-[#cec5b9]">The page you are looking for does not exist.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
