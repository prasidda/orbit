import { AppShell } from "@/components/shell/app-shell";
import { AuthGate } from "@/components/auth-gate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
