import { FolderPlus } from "lucide-react";

interface EmptyWorkspaceProps {
  onNewProject: () => void;
}

export function EmptyWorkspace({ onNewProject }: EmptyWorkspaceProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-base-800 p-4">
        <FolderPlus size={28} className="text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">Nenhum projeto selecionado</p>
        <p className="mt-1 text-xs text-muted">
          Cadastre seu primeiro projeto para comecar a organizar seu trabalho.
        </p>
      </div>
      <button
        onClick={onNewProject}
        className="rounded-card bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        + Novo Projeto
      </button>
    </div>
  );
}
