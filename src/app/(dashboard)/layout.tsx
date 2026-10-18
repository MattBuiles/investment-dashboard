import { ConfirmProvider, ToastProvider } from "strata";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { isBudgetOwner, SPLITSTREAM_URL } from "@/lib/splitstream";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Calculado en el servidor: los no dueños no reciben ni el enlace ni la URL.
  const budgetUrl = isBudgetOwner(user?.email) ? SPLITSTREAM_URL : undefined;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex min-h-screen">
          <Sidebar userEmail={user?.email} budgetUrl={budgetUrl} />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <MobileNav budgetUrl={budgetUrl} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
