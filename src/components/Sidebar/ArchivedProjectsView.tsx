import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";

interface ArchivedProjectsViewProps {
  projects: Project[];
  onUnarchive: (project: Project) => void;
  onDelete: (id: number) => void;
}

/**
 * Lista os projetos com status "archived". Reaproveita os dados que ja
 * estao em memoria (useProjects ja carrega todos os status) — nao precisa
 * de nenhum comando novo no backend, so filtrar e dar acoes de
 * reabrir/excluir.
 */
export function ArchivedProjectsView({ projects, onUnarchive, onDelete }: ArchivedProjectsViewProps) {
  const archived = projects.filter((p) => p.status === "archived");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border-subtle px-6 py-4">
        <Archive size={18} className="text-accent" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Projetos Arquivados</h1>
          <p className="text-xs text-muted">Projetos arquivados ficam aqui até você reabrir ou excluir.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {archived.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Archive size={28} className="text-muted" />
            <p className="text-sm text-slate-300">Nenhum projeto arquivado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {archived.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-card border border-border-subtle bg-base-900 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{project.name}</p>
                  <p className="truncate text-xs text-muted">{project.path ?? "sem pasta vinculada"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onUnarchive(project)}
                    title="Reabrir projeto"
                    className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-200 hover:bg-base-800"
                  >
                    <ArchiveRestore size={13} />
                    Reabrir
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${project.name}" permanentemente? Essa ação não pode ser desfeita.`)) {
                        onDelete(project.id);
                      }
                    }}
                    title="Excluir permanentemente"
                    className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-danger hover:bg-base-800"
                  >
                    <Trash2 size={13} />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
