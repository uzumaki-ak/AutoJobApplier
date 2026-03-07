// [F51] src/components/generate/profile-selector.tsx — Resume profile selector

"use client";

import type { Profile } from "@/types/profile";

interface ProfileSelectorProps {
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
}

export function ProfileSelector({ profiles, value, onChange }: ProfileSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-[var(--color-muted-foreground)] whitespace-nowrap">Profile:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] min-w-[180px]"
      >
        <option value="auto">🤖 Auto-select</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.isDefault ? "⭐ " : ""}{p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
