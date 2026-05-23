"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getProfile } from "@/lib/api/auth.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { loginSchema, type LoginValues } from "@/lib/validators/auth.validators";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  return "Unable to sign in";
}

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError("");
    try {
      const session = await signIn(values.email, values.password);
      const token = session.access_token;
      const profile = await getProfile(token);
      if (!profile || !profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = getMessage(error);
      if (message.includes("PROFILE_NOT_FOUND") || message.toLowerCase().includes("not found")) {
        router.push("/onboarding");
        return;
      }
      setFormError(message);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? <Toast message={formError} variant="error" /> : null}
      <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
      <div className="flex items-center justify-end">
        <Link className="text-sm text-[#cec5b9] transition-all duration-200 ease-in-out hover:text-[#fff2de]" href="/reset-password">
          Forgot password?
        </Link>
      </div>
      <Input label="Password" type="password" placeholder="Enter your password" error={errors.password?.message} {...register("password")} />
      <label className="flex items-center gap-2 text-sm text-[#cec5b9]">
        <input type="checkbox" className="h-4 w-4 rounded border-[#4c463d] bg-[#1a1a1a]" {...register("rememberMe")} />
        Remember me
      </label>
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Sign in
      </Button>
      <p className="text-sm text-[#cec5b9]">
        New to AlmondAI?{" "}
        <Link className="text-[#d5c5a8] transition-all duration-200 ease-in-out hover:text-[#fff2de]" href="/signup">
          Create account
        </Link>
      </p>
    </form>
  );
}
