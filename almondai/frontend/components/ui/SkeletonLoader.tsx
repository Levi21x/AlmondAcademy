import { cn } from "@/lib/utils/helpers";

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[linear-gradient(90deg,#201f1f_0%,#2a2a2a_50%,#201f1f_100%)]",
        className,
      )}
      aria-hidden="true"
    />
  );
}
