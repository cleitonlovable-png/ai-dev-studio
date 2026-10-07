import { FileText } from "lucide-react";
import type { Project } from "@/types/project";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { Card } from "@/components/common/Card";

interface FilesTabProps {
  project: Project;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

export function FilesTab({ project }: FilesTabProps) {
  const { files, fileCount, loading } = useRecentFiles(project.path, 30);

  return (
    <Card
      title="Arquivos Recentes"
      action={
        typeof fileCount === "number" ? (
          <span className="text-xs text-muted">{fileCount} arquivos no total</span>
        ) : undefined
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Escaneando arquivos...</p>
      ) : files.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhum arquivo encontrado nessa pasta.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {files.map((file) => (
            <li key={file.relativePath} className="flex items-center gap-3 py-2.5">
              <FileText size={15} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{file.relativePath}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{formatRelativeTime(file.modifiedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
