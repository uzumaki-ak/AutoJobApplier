// [F44] src/components/dashboard/quick-generate.tsx — Quick generate widget

import { Zap, User } from "lucide-react";
import Link from "next/link";

export function QuickGenerate({ hasProfiles }: { hasProfiles: boolean }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4 h-full">
      <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)] tracking-wide">
        QUICK ACTIONS
      </h2>

      <div className="space-y-3">
        {hasProfiles ? (
          <Link
            href="/generate"
            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
          >
            <Zap size={20} />
            <div>
              <p className="font-semibold text-sm">Generate Email</p>
              <p className="text-xs opacity-80">From screenshot, text, or URL</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/profiles"
            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:opacity-90 transition-opacity"
          >
            <User size={20} />
            <div>
              <p className="font-semibold text-sm">Setup Profile</p>
              <p className="text-xs opacity-80">Required before generating</p>
            </div>
          </Link>
        )}

        <Link
          href="/applications"
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
        >
          <div className="text-[var(--color-primary)]">📋</div>
          <div>
            <p className="font-medium text-sm">Kanban Board</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Track all applications</p>
          </div>
        </Link>

        <Link
          href="/analytics"
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
        >
          <div className="text-[var(--color-primary)]">📊</div>
          <div>
            <p className="font-medium text-sm">Analytics</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Response rates & trends</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
