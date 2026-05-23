"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";

import { cn } from "@/lib/utils/helpers";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    success,
    leftIcon,
    rightIcon,
    type,
    className,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      {label ? <span className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-widest text-[var(--aa-text-3)]">{label}</span> : null}
      <div className="relative">
        {leftIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aa-text-2)]">{leftIcon}</span> : null}
        <input
          ref={ref}
          type={resolvedType}
          className={cn(
            "aa-input w-full rounded-[var(--aa-r)] border border-[var(--aa-border)] bg-[var(--aa-input)] px-5 py-3 text-[var(--aa-text-1)] placeholder:text-[var(--aa-text-3)] outline-none transition-all duration-200",
            "focus:border-[var(--aa-amber)] focus:ring-2 focus:ring-[var(--aa-amber-border)]/50",
            leftIcon ? "pl-10" : undefined,
            rightIcon || isPassword ? "pr-11" : undefined,
            error && "border-[#ffb4ab]/60 focus:ring-[#ffb4ab]/40",
            success && !error && "border-[var(--aa-green-border)]",
            className,
          )}
          {...props}
        />
        {rightIcon ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aa-text-2)]">{rightIcon}</span> : null}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--aa-text-2)] transition-all duration-200 hover:text-[var(--aa-text-1)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined text-base">{showPassword ? "visibility_off" : "visibility"}</span>
          </button>
        ) : null}
      </div>
      {error ? <span className="mt-1.5 block text-xs text-[#ffb4ab]">{error}</span> : null}
    </label>
  );
});

Input.displayName = "Input";
