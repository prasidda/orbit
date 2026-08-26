import { SignIn } from "@clerk/nextjs";
import { Brand } from "@/components/shell/brand";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ground px-5 py-12">
      <div className="space-y-3 text-center">
        <Brand className="justify-center" />
        <p className="mx-auto max-w-[34ch] text-sm text-ink-muted">
          One shell, many tools. Sign in and everything you track lands in the same warm place.
        </p>
      </div>
      <SignIn />
    </main>
  );
}
