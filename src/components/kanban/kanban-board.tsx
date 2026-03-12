// [F45] src/components/kanban/kanban-board.tsx - Main dnd-kit Kanban board
// Drag cards between columns to update status

"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import { useToast } from "@/hooks/use-toast";
import type { Application, ApplicationStatus } from "@/types/application";

const COLUMNS: { id: ApplicationStatus; label: string; emoji: string }[] = [
  { id: "SAVED", label: "Saved", emoji: "S" },
  { id: "APPLIED", label: "Applied", emoji: "A" },
  { id: "INTERVIEW", label: "Interview", emoji: "I" },
  { id: "OFFER", label: "Offer", emoji: "O" },
  { id: "REJECTED", label: "Rejected", emoji: "R" },
  { id: "NO_RESPONSE", label: "No Response", emoji: "N" },
];

interface KanbanBoardProps {
  initialApplications: Application[];
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getColumnApps = useCallback(
    (status: ApplicationStatus) => applications.filter((application) => application.status === status),
    [applications]
  );

  function handleDragStart(event: DragStartEvent) {
    const application = applications.find((item) => item.id === event.active.id);
    setActiveApp(application ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const applicationId = active.id as string;
    const newStatus = over.id as ApplicationStatus;
    const application = applications.find((item) => item.id === applicationId);

    if (!application || application.status === newStatus) {
      return;
    }

    setApplications((prev) =>
      prev.map((item) => (item.id === applicationId ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast({ title: `Moved to ${newStatus.replace("_", " ")}` });
    } catch {
      setApplications((prev) =>
        prev.map((item) => (item.id === applicationId ? { ...item, status: application.status } : item))
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
      <div className="flex min-h-[60vh] gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            emoji={column.emoji}
            applications={getColumnApps(column.id)}
            onRefresh={(updated) =>
              setApplications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            }
            onDelete={(id) => setApplications((prev) => prev.filter((item) => item.id !== id))}
          />
        ))}
      </div>

      <DragOverlay>{activeApp && <KanbanCard application={activeApp} isDragging />}</DragOverlay>
    </DndContext>
  );
}
