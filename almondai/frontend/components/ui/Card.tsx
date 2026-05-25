import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/helpers";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
  interactive?: boolean;
}

export function Card({ children, hover = false, glow = false, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "aa-card rounded-[var(--aa-r-lg)] border border-[var(--aa-border)] bg-[var(--aa-s2)] p-6",
        (hover || interactive) && "aa-card-interactive",
        glow && "card-glow",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
