import { cn } from "@/lib/utils/helpers";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-[rgba(76,70,61,0.5)] border-t-[#fff2de]", className)}
      aria-hidden="true"
    />
  );
}
