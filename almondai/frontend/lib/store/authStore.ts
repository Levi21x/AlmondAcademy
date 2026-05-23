import { create } from "zustand";

import type { StudentProfile } from "@/lib/api/auth.api";

interface AuthStoreState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  profile: StudentProfile | null;
  setAuth: (payload: { accessToken: string; userId: string; email: string }) => void;
  setProfile: (profile: StudentProfile | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  accessToken: null,
  userId: null,
  email: null,
  profile: null,
  setAuth: ({ accessToken, userId, email }) => {
    set({ accessToken, userId, email });
  },
  setProfile: (profile) => {
    set({ profile });
  },
  clearAuth: () => {
    set({ accessToken: null, userId: null, email: null, profile: null });
  },
}));
