// [F46] src/components/kanban/kanban-column.tsx — Single Kanban column

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import type { Application, ApplicationStatus } from "@/types/application";
import { STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: ApplicationStatus;
  label: string;
  emoji: string;
  applications: Application[];
  onRefresh: (updated: Application) => void;
  onDelete: (id: string) => void;
}

export function KanbanColumn({ id, label, emoji, applications, onRefresh, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const colors = STATUS_COLORS[id];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-64 md:w-72 flex flex-col rounded-2xl border transition-colors",
        "bg-[var(--color-muted)] border-[var(--color-border)]",
        isOver && "border-[var(--color-primary)] bg-[var(--color-accent)]"
      )}
    >
      {/* Column header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{emoji}</span>
            <span className="font-display text-xs font-semibold text-[var(--color-foreground)] tracking-wide">
              {label.toUpperCase()}
            </span>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-lg font-medium", colors.bg, colors.text)}>
            {applications.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} onRefresh={onRefresh} onDelete={onDelete} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--color-muted-foreground)]">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
