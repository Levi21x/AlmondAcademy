"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { signupSchema, type SignupValues } from "@/lib/validators/auth.validators";

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to create account";
}

export function SignupForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const password = watch("password") ?? "";

  const checks = useMemo(
    () => [
      { label: "At least 8 characters", ok: password.length >= 8 },
      { label: "At least one uppercase letter", ok: /[A-Z]/.test(password) },
      { label: "At least one number", ok: /[0-9]/.test(password) },
    ],
    [password],
  );

  const onSubmit = async (values: SignupValues) => {
    setFormError("");
    try {
      await signUp(values.fullName, values.email, values.password);
      router.push("/onboarding");
    } catch (error: unknown) {
      setFormError(getMessage(error));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? <Toast message={formError} variant="error" /> : null}
      <Input label="Full name" placeholder="Dr. Aditi Sharma" error={errors.fullName?.message} {...register("fullName")} />
      <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
      <Input label="Password" type="password" placeholder="Create a secure password" error={errors.password?.message} {...register("password")} />
      <Input
        label="Confirm password"
        type="password"
        placeholder="Re-enter password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <div className="rounded-xl border border-[#4c463d] bg-[#1a1a1a] p-3 text-xs">
        <p className="mb-2 font-medium text-[#fff2de]">Password requirements</p>
        <ul className="flex flex-wrap gap-2">
          {checks.map((check) => (
            <li
              key={check.label}
              className={
                check.ok
                  ? "rounded-full bg-[#2a2520] px-2 py-1 text-[#d5c5a8]"
                  : "rounded-full bg-[#201f1f] px-2 py-1 text-[#9d9488]"
              }
            >
              {check.label}
            </li>
          ))}
        </ul>
      </div>
      <label className="flex items-start gap-2 text-sm text-[#cec5b9]">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#4c463d] bg-[#1a1a1a]" {...register("acceptedTerms")} />
        I agree to the Terms of Service and Privacy Policy
      </label>
      {errors.acceptedTerms?.message ? <p className="text-xs text-[#DD5533]">{errors.acceptedTerms.message}</p> : null}
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Create my account
      </Button>
      <p className="text-sm text-[#cec5b9]">
        Already have an account?{" "}
        <Link className="text-[#d5c5a8] transition-all duration-200 ease-in-out hover:text-[#fff2de]" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
