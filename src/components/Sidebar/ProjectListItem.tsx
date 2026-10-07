import { Folder, Lightbulb } from "lucide-react";
import type { Project } from "@/types/project";

interface ProjectListItemProps {
  project: Project;
  active: boolean;
  onClick: () => void;
}

const STATUS_DOT: Record<Project["status"], string> = {
  active: "bg-success",
  paused: "bg-warning",
  done: "bg-accent",
  archived: "bg-muted",
};

export function ProjectListItem({ project, active, onClick }: ProjectListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors ${
        active
          ? "bg-base-700 ring-1 ring-accent/40"
          : "hover:bg-base-800"
      }`}
    >
      {project.path ? (
        <Folder size={18} className={active ? "text-accent" : "text-muted"} />
      ) : (
        <Lightbulb size={18} className={active ? "text-accent" : "text-warning"} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-100">
            {project.name}
          </span>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[project.status]}`} />
        </div>
        <div className="truncate text-xs text-muted">
          {project.path ?? "Em planejamento — sem pasta ainda"}
        </div>
      </div>
    </button>
  );
}
