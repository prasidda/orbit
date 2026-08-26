import { AppShell } from "@/components/shell/app-shell";
import { EnsureUser } from "@/components/ensure-user";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell>
      <EnsureUser />
      {children}
    </AppShell>
  );
}
