import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/helpers";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, hover = false, glow = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "aa-card rounded-[var(--aa-r-lg)] border border-[var(--aa-border)] bg-[var(--aa-s2)] p-6",
        hover && "transition-all duration-200 hover:border-[var(--aa-border2)] hover:bg-[var(--aa-s2)]",
        glow && "card-glow transition-all duration-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
