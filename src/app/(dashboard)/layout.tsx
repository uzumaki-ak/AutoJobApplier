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
    <div className="min-h-screen bg-[var(--color-background)] md:flex md:h-screen md:overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block md:shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session.user} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
