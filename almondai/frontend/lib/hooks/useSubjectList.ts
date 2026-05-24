"use client";

import { useEffect, useState } from "react";

import { getSubjects } from "@/lib/api/syllabus.api";
import { useAuthStore } from "@/lib/store/authStore";

export function useSubjectList(): { subjects: string[]; loaded: boolean } {
  const token = useAuthStore((state) => state.accessToken);
  const profile = useAuthStore((state) => state.profile);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

    getSubjects(token)
      .then((rows) => {
        const year = profile?.current_year;
        const filtered =
          year && year >= 1 && year <= 4 ? rows.filter((s) => s.year === year) : rows;
        setSubjects(filtered.map((s) => s.name));
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, [token, profile?.current_year]);

  return { subjects, loaded };
}
