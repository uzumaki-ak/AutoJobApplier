// [F45] src/components/kanban/kanban-board.tsx — Main dnd-kit Kanban board
// Drag cards between columns to update status

"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { Application, ApplicationStatus } from "@/types/application";
import { useToast } from "@/hooks/use-toast";

const COLUMNS: { id: ApplicationStatus; label: string; emoji: string }[] = [
  { id: "APPLIED", label: "Applied", emoji: "🟡" },
  { id: "INTERVIEW", label: "Interview", emoji: "🔵" },
  { id: "OFFER", label: "Offer", emoji: "🟢" },
  { id: "REJECTED", label: "Rejected", emoji: "🔴" },
  { id: "NO_RESPONSE", label: "No Response", emoji: "⚫" },
];

interface KanbanBoardProps {
  initialApplications: Application[];
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /** Group apps by status */
  const getColumnApps = useCallback(
    (status: ApplicationStatus) => applications.filter((a) => a.status === status),
    [applications]
  );

  function handleDragStart(event: DragStartEvent) {
    const app = applications.find((a) => a.id === event.active.id);
    setActiveApp(app ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const appId = active.id as string;
    const newStatus = over.id as ApplicationStatus;

    const app = applications.find((a) => a.id === appId);
    if (!app || app.status === newStatus) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `Moved to ${newStatus.replace("_", " ")}` });
    } catch {
      // Revert on failure
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: app.status } : a))
      );
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            emoji={col.emoji}
            applications={getColumnApps(col.id)}
            onRefresh={(updated) =>
              setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
            }
            onDelete={(id) => setApplications((prev) => prev.filter((a) => a.id !== id))}
          />
        ))}
      </div>

      {/* Drag overlay — shows while dragging */}
      <DragOverlay>
        {activeApp && <KanbanCard application={activeApp} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
