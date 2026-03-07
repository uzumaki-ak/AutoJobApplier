// [F43] src/components/dashboard/stats-cards.tsx — 4 summary stat cards

"use client";

import { Briefcase, Calendar, Trophy, Send } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    interviews: number;
    offers: number;
    applied: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total Applied", value: stats.total, icon: Send, color: "text-blue-400" },
    { label: "Active (Applied)", value: stats.applied, icon: Briefcase, color: "text-yellow-400" },
    { label: "Interviews", value: stats.interviews, icon: Calendar, color: "text-purple-400" },
    { label: "Offers", value: stats.offers, icon: Trophy, color: "text-green-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="glass rounded-2xl p-5 flex items-center gap-4">
          <div className={`p-2 rounded-xl bg-[var(--color-muted)] ${color}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
