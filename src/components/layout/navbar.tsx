// [F40] src/components/layout/navbar.tsx — Top navigation bar

"use client";

import { ThemeToggle } from "./theme-toggle";
import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Sidebar } from "./sidebar";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
        {/* Mobile menu */}
        <button
          className="md:hidden p-2 rounded-xl text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* App name — mobile */}
        <span className="md:hidden font-display text-sm font-bold text-[var(--color-primary)]">
          OUTREACH.AI
        </span>

        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="flex items-center gap-2 ml-2">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="hidden sm:block text-sm text-[var(--color-foreground)] max-w-[120px] truncate">
              {user.name}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="p-2 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-muted)] transition-all"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
