const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type FeedbackCategory = "bug" | "feature" | "general";

export async function submitFeedback(token: string, category: FeedbackCategory, message: string): Promise<{ id: string | null; submitted: boolean }> {
  const res = await fetch(`${apiBase}/api/v1/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category, message }),
  });

  if (!res.ok) {
    throw new Error("Failed to submit feedback");
  }

  const payload = (await res.json()) as ApiEnvelope<{ id: string | null; submitted: boolean }>;
  return payload.data;
}
