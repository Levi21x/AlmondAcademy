"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validators/auth.validators";

export function ResetPasswordForm() {
  const { sendResetLink } = useAuth();
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError("");
    try {
      await sendResetLink(values.email);
      setSuccess(true);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Unable to send reset email");
    }
  };

  if (success) {
    return (
      <Card className="space-y-4 text-center">
        <h3 className="text-lg font-semibold text-[#fff2de]">Check your email</h3>
        <p className="text-[#cec5b9]">Check your email — we&apos;ve sent you a reset link</p>
        <Link className="text-sm text-[#d5c5a8] transition-all duration-200 ease-in-out hover:text-[#fff2de]" href="/login">
          Back to login
        </Link>
      </Card>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? <Toast message={formError} variant="error" /> : null}
      <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Send reset link
      </Button>
      <Link className="block text-center text-sm text-[#d5c5a8] transition-all duration-200 ease-in-out hover:text-[#fff2de]" href="/login">
        Back to login
      </Link>
    </form>
  );
}
