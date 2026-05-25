import { cn } from "@/lib/utils/helpers";

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div
      className={cn("aa-skeleton rounded-xl", className)}
      aria-hidden="true"
    />
  );
}
