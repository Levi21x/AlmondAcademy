"use client";

import { useQuery } from "@tanstack/react-query";

import { getProfile, getTodayUsage } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/authStore";

export function useProfile() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["profile", token],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      return getProfile(token);
    },
    enabled: Boolean(token),
    retry: false,
  });
}

export function useTodayUsage() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["usage-today", token],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      return getTodayUsage(token);
    },
    enabled: Boolean(token),
    retry: false,
  });
}
