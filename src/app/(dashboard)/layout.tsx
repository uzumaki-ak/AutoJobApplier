// [F07] src/app/(dashboard)/layout.tsx — Dashboard shell
// Sidebar + navbar layout, protected route — redirects to /sign-in if not auth

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session.user} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
