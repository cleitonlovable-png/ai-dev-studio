import { useState } from "react";
import { Archive, Folder, Lightbulb, MoreVertical, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import { openInFileExplorer } from "@/services/shell";

interface WorkspaceHeaderProps {
  project: Project;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const STATUS_LABEL: Record<Project["status"], string> = {
  active: "Em desenvolvimento",
  paused: "Pausado",
  done: "Concluido",
  archived: "Arquivado",
};

const STATUS_BADGE: Record<Project["status"], string> = {
  active: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  done: "bg-accent/15 text-accent",
  archived: "bg-muted/15 text-muted",
};

export function WorkspaceHeader({ project, onArchive, onDelete }: WorkspaceHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-stretch justify-between gap-6 px-6 pb-4 pt-6">
      <div className="flex flex-1 items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-card bg-base-800 p-2.5">
            {project.path ? (
              <Folder size={22} className="text-accent" />
            ) : (
              <Lightbulb size={22} className="text-warning" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-100">{project.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[project.status]}`}>
                {STATUS_LABEL[project.status]}
              </span>
            </div>
            <p className="text-xs text-muted">
              {project.path ?? "Em planejamento — sem pasta vinculada ainda"}
            </p>
            {project.description && (
              <p className="mt-1 text-sm text-slate-400">{project.description}</p>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          {project.path && (
            <button
              onClick={() => openInFileExplorer(project.path!)}
              className="rounded-lg border border-border-subtle px-3 py-2 text-sm text-slate-200 hover:bg-base-800"
            >
              Abrir Pasta
            </button>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg border border-border-subtle p-2 text-muted hover:bg-base-800 hover:text-slate-200"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              {/* backdrop para fechar ao clicar fora */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-card border border-border-subtle bg-base-850 py-1 shadow-xl">
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    setActionError(null);
                    try {
                      await onArchive();
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-base-700"
                >
                  <Archive size={14} /> Arquivar projeto
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setActionError(null);
                    setConfirmingDelete(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                >
                  <Trash2 size={14} /> Excluir projeto
                </button>
              </div>
            </>
          )}

          {actionError && !confirmingDelete && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-card border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger shadow-xl">
              {actionError}
            </div>
          )}
        </div>
      </div>

      <HeroBanner />

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-100">Excluir "{project.name}"?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Isso remove o projeto e todos os dados ligados a ele (tarefas, memória, sessões,
              backups, checks e relatórios) do CSC Studio.
              {project.path && (
                <>
                  {" "}Os arquivos da pasta{" "}
                  <span className="font-mono text-xs text-slate-300">{project.path}</span> não são
                  apagados do disco.
                </>
              )}
            </p>
            {actionError && (
              <p className="mt-2 rounded bg-danger/10 px-2 py-1.5 text-xs text-danger">{actionError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  setActionError(null);
                  try {
                    await onDelete();
                    setConfirmingDelete(false);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Faixa decorativa a direita do cabecalho, no espirito das telas de
 * referencia (banner com as palavras-chave do produto). Puramente visual,
 * nao carrega dado nenhum do projeto.
 */
function HeroBanner() {
  return (
    <div className="relative hidden w-64 shrink-0 overflow-hidden rounded-card bg-gradient-to-br from-base-800 via-base-850 to-accent/20 xl:block">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-5">
        <span className="text-xs font-semibold tracking-wide text-slate-400">Ideias</span>
        <span className="text-xs font-semibold tracking-wide text-slate-300">Código</span>
        <span className="text-sm font-bold tracking-wide text-accent">Resultados</span>
      </div>
    </div>
  );
}
