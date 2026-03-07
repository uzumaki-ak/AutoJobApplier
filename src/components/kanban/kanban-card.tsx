// [F47] src/components/kanban/kanban-card.tsx — Draggable application card

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ExternalLink } from "lucide-react";
import type { Application } from "@/types/application";
import { formatDate, scoreColor, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ApplicationModal } from "./application-modal";

interface KanbanCardProps {
  application: Application;
  isDragging?: boolean;
  onRefresh?: (updated: Application) => void;
  onDelete?: (id: string) => void;
}

export function KanbanCard({ application: app, isDragging, onRefresh, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: app.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "glass rounded-xl p-3 cursor-grab active:cursor-grabbing select-none",
        (isDragging || isSortableDragging) && "opacity-50 shadow-2xl scale-105",
        "hover:border-[var(--color-primary)]/40 transition-all"
      )}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          className="mt-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0 cursor-grab"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Company + role */}
          <div>
            <p className="font-semibold text-sm text-[var(--color-foreground)] truncate">{app.company}</p>
            <p className="text-xs text-[var(--color-muted-foreground)] truncate">{truncate(app.role, 40)}</p>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted-foreground)]">{formatDate(app.appliedAt)}</span>
            {app.matchScore != null && (
              <span className={cn("text-xs font-display font-bold", scoreColor(app.matchScore))}>
                {app.matchScore}%
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onRefresh && onDelete && (
              <ApplicationModal application={app} onSave={onRefresh} onDelete={onDelete} />
            )}
            <Link
              href={`/applications/${app.id}`}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
