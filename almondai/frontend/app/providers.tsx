"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 5 min — no refetch on every page navigation
        staleTime: 5 * 60 * 1000,
        // Keep unused data in memory for 10 min
        gcTime: 10 * 60 * 1000,
        // Don't hammer the backend on window focus (student switches tabs)
        refetchOnWindowFocus: false,
        // One retry is enough; avoid cascading load on transient errors
        retry: 1,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
