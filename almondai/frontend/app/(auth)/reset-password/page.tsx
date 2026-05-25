import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/Card";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#131313] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-md">
        <Card className="space-y-6 aa-anim-fade-up">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-2xl font-bold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md tactile-gradient text-xs font-bold text-[#131313]">A</span>
              <span className="text-[#fff2de]">almond</span>
              <span className="text-[#d5c5a8]">AI</span>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-[#fff2de]">Reset your password</h1>
            <p className="mt-2 text-[#cec5b9]">We&apos;ll send you a reset link</p>
          </div>
          <ResetPasswordForm />
        </Card>
      </div>
    </main>
  );
}
