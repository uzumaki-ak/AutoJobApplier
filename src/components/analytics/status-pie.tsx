// [F56] src/components/analytics/status-pie.tsx — Status distribution pie

"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS: Record<string, string> = {
  APPLIED: "#eab308",
  INTERVIEW: "#3b82f6",
  OFFER: "#22c55e",
  REJECTED: "#ef4444",
  NO_RESPONSE: "#6b7280",
};

const LABELS: Record<string, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  NO_RESPONSE: "No Response",
};

interface Props {
  data: Array<{ status: string; count: number }>;
}

export function StatusPie({ data }: Props) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-[var(--color-muted-foreground)] text-sm">No data yet</div>;
  }

  const mapped = data.map((d) => ({ name: LABELS[d.status] ?? d.status, value: d.count, color: COLORS[d.status] ?? "#888" }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={mapped} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
          {mapped.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
