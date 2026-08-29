import { SignUp } from "@clerk/nextjs";
import { Brand } from "@/components/shell/brand";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ground px-5 py-12">
      <div className="space-y-3 text-center">
        <Brand className="justify-center" />
        <p className="mx-auto max-w-[34ch] text-sm text-ink-muted">
          Make an account and you can share a tool or two with a friend — everything is private
          until you choose otherwise.
        </p>
      </div>
      <SignUp />
    </main>
  );
}
