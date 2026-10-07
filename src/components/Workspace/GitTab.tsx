import { ExternalLink, GitBranch, GitCommit as GitCommitIcon } from "lucide-react";
import type { Project } from "@/types/project";
import { useGitStatus } from "@/hooks/useGitStatus";
import { Card } from "@/components/common/Card";

interface GitTabProps {
  project: Project;
}

function FileList({ title, files, color }: { title: string; files: string[]; color: string }) {
  if (files.length === 0) return null;
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${color}`}>
        {title} ({files.length})
      </p>
      <ul className="space-y-0.5">
        {files.slice(0, 8).map((f) => (
          <li key={f} className="truncate font-mono text-xs text-slate-400">
            {f}
          </li>
        ))}
        {files.length > 8 && (
          <li className="text-xs text-muted">+ {files.length - 8} outros</li>
        )}
      </ul>
    </div>
  );
}

export function GitTab({ project }: GitTabProps) {
  const { status, loading, error } = useGitStatus(project.path);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Verificando repositório Git...</p>;
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-danger">Erro ao ler o Git: {error}</p>;
  }

  if (!status || !status.isRepo) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <GitBranch size={24} className="text-muted" />
        <p className="text-sm text-slate-300">Esta pasta não é um repositório Git.</p>
        <p className="text-xs text-muted">Rode `git init` na pasta do projeto se quiser rastrear versões.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Status">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted">
              <GitBranch size={14} /> Branch
            </span>
            <span className="rounded bg-base-700 px-2 py-0.5 font-mono text-xs text-slate-200">
              {status.branch ?? "desconhecida"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Status</span>
            <span className={status.clean ? "text-success" : "text-warning"}>
              {status.clean ? "Limpo" : "Alterações pendentes"}
            </span>
          </div>

          {status.remoteUrl && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Remote</span>
              <a
                href={status.remoteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-xs text-accent hover:underline"
              >
                Abrir <ExternalLink size={11} />
              </a>
            </div>
          )}

          {!status.clean && (
            <div className="space-y-3 border-t border-border-subtle pt-3">
              <FileList title="Modificados" files={status.modified} color="text-warning" />
              <FileList title="Adicionados" files={status.added} color="text-success" />
              <FileList title="Removidos" files={status.removed} color="text-danger" />
              <FileList title="Não rastreados" files={status.untracked} color="text-muted" />
            </div>
          )}
        </div>
      </Card>

      <Card title="Último commit">
        {status.lastCommit ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 font-mono text-xs text-accent">
              <GitCommitIcon size={12} /> {status.lastCommit.hash}
            </p>
            <p className="text-sm text-slate-200">{status.lastCommit.message}</p>
            <p className="text-xs text-muted">
              {status.lastCommit.author} —{" "}
              {new Date(status.lastCommit.date).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhum commit ainda.</p>
        )}
      </Card>
    </div>
  );
}
