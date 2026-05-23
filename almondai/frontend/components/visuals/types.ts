export interface VisualRendererProps {
  data: Record<string, unknown>;
}

export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
