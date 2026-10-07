import { Trash2 } from "lucide-react";
import type { Task } from "@/types/task";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export function TaskItem({ task, onToggle, onDelete, compact }: TaskItemProps) {
  const done = task.status === "done";
  const dueLabel = formatDueDate(task.dueDate);

  return (
    <div className="group flex items-center gap-3 py-2">
      <button
        onClick={() => onToggle(task.id)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          done ? "border-success bg-success" : "border-border-subtle hover:border-accent"
        }`}
        aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
      >
        {done && <span className="text-[10px] leading-none text-white">✓</span>}
      </button>

      <span className={`flex-1 truncate text-sm ${done ? "text-muted line-through" : "text-slate-200"}`}>
        {task.title}
      </span>

      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[task.priority]}`}>
        {PRIORITY_LABEL[task.priority]}
      </span>

      {!compact && dueLabel && <span className="shrink-0 text-xs text-muted">{dueLabel}</span>}

      {onDelete && (
        <button
          onClick={() => onDelete(task.id)}
          className="shrink-0 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
