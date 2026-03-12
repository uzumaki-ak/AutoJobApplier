// [F41] src/components/layout/sidebar.tsx — Left navigation sidebar

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, Zap, User, BarChart3, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/generate", icon: Zap, label: "Generate" },
  { href: "/applications", icon: Kanban, label: "Applications" },
  { href: "/profiles", icon: User, label: "Profiles" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] md:sticky md:top-0">
      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--color-border)] shrink-0">
        <span className="font-display text-sm font-bold text-[var(--color-primary)] tracking-wider">
          OUTREACH.AI
        </span>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-muted-foreground)] text-center">
          AI Job Outreach v1.0
        </p>
      </div>
    </aside>
  );
}
