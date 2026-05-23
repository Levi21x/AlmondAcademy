import { apiClient } from "@/lib/api/axios";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AxiosError } from "axios";

export type StudentMode = "mbbs" | "neet_pg" | "both";
export type StudentCategory =
  | "survivor"
  | "sprinter"
  | "anxious_grinder"
  | "passionate"
  | "lost"
  | "strategic_climber";
export type TeachingStyle = "concise" | "detailed" | "visual" | "conversational";

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  college_name: string | null;
  university_name: string | null;
  current_year: number | null;
  mode: StudentMode;
  student_category: StudentCategory | null;
  teaching_style: TeachingStyle;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  date: string;
  questions_asked: number;
  voice_minutes_used: number;
  crisis_mode_used: boolean;
  created_at: string;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function verifyToken(token: string): Promise<{ valid: boolean; user_id: string; email: string }> {
  const response = await apiClient.post<ApiSuccess<{ valid: boolean; user_id: string; email: string }>>(
    "/api/v1/auth/verify-token",
    {},
    { headers: authHeader(token) },
  );
  return response.data.data;
}

export async function getProfile(token?: string): Promise<StudentProfile> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = token ?? session?.access_token;
    if (!accessToken) {
      return null as unknown as StudentProfile;
    }

    const response = await apiClient.get<ApiSuccess<StudentProfile>>("/api/v1/auth/profile", {
      headers: authHeader(accessToken),
    });
    return response.data.data ?? (null as unknown as StudentProfile);
  } catch (error: unknown) {
    const status = (error as AxiosError)?.response?.status;
    if (status === 404) {
      return null as unknown as StudentProfile;
    }
    if (status === 401) {
      return null as unknown as StudentProfile;
    }
    return null as unknown as StudentProfile;
  }
}

export async function createProfile(
  token: string,
  payload: Omit<StudentProfile, "id" | "user_id" | "created_at" | "updated_at" | "onboarding_completed"> & {
    onboarding_completed?: boolean;
  },
): Promise<StudentProfile> {
  const response = await apiClient.post<ApiSuccess<StudentProfile>>("/api/v1/auth/profile", payload, {
    headers: authHeader(token),
  });
  return response.data.data;
}

export async function updateProfile(
  token: string,
  payload: Partial<Pick<StudentProfile, "full_name" | "college_name" | "university_name" | "current_year" | "mode" | "student_category" | "teaching_style" | "onboarding_completed">>,
): Promise<StudentProfile> {
  const response = await apiClient.patch<ApiSuccess<StudentProfile>>("/api/v1/auth/profile", payload, {
    headers: authHeader(token),
  });
  return response.data.data;
}

export async function getTodayUsage(token: string): Promise<DailyUsage> {
  const response = await apiClient.get<ApiSuccess<DailyUsage>>("/api/v1/auth/usage/today", {
    headers: authHeader(token),
  });
  return response.data.data;
}

export async function incrementTodayUsage(token: string): Promise<DailyUsage> {
  const response = await apiClient.patch<ApiSuccess<DailyUsage>>(
    "/api/v1/auth/usage/today",
    {},
    {
      headers: authHeader(token),
    },
  );
  return response.data.data;
}
