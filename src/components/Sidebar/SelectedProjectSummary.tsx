import type { Project } from "@/types/project";
import { useGitStatus } from "@/hooks/useGitStatus";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { useTasks } from "@/hooks/useTasks";

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "Em desenvolvimento",
  paused: "Pausado",
  done: "Concluído",
  archived: "Arquivado",
};

interface SelectedProjectSummaryProps {
  project: Project;
}

export function SelectedProjectSummary({ project }: SelectedProjectSummaryProps) {
  const { status: git } = useGitStatus(project.path);
  const { fileCount } = useRecentFiles(project.path, 1);
  const { tasks } = useTasks(project.id);

  const pendingTasks = tasks.filter((t) => t.status !== "done").length;

  const rows: Array<[string, string]> = [
    ["Tecnologia", project.stack ?? "Não detectado"],
    ["Branch", git?.isRepo ? git.branch ?? "-" : "Não é Git"],
    ["Status", STATUS_LABEL[project.status]],
    ["Arquivos", typeof fileCount === "number" ? String(fileCount) : "-"],
    ["Tarefas pendentes", String(pendingTasks)],
  ];

  return (
    <div className="mx-2 mb-2 rounded-card border border-border-subtle bg-base-850 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Resumo do Projeto
      </p>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="truncate text-right text-slate-200" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
