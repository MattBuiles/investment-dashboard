import { ConfirmProvider, ToastProvider } from "strata";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { isBudgetOwner } from "@/lib/splitstream";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const showBudget = isBudgetOwner(user?.email);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex min-h-screen">
          <Sidebar userEmail={user?.email} showBudget={showBudget} />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <MobileNav showBudget={showBudget} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
