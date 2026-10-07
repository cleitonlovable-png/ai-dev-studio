import { AlertTriangle } from "lucide-react";
import type { Backup } from "@/types/backup";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

interface RestoreConfirmModalProps {
  backup: Backup;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function RestoreConfirmModal({ backup, onConfirm, onCancel }: RestoreConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={18} className="text-warning" />
          <h2 className="text-base font-semibold text-slate-100">Restaurar backup?</h2>
        </div>
        <div className="mb-4 space-y-1 text-sm text-slate-400">
          <p>
            Backup de <span className="text-slate-200">{formatDateTime(backup.createdAt)}</span> (
            {backup.fileCount} arquivos)
          </p>
          <p className="text-xs text-muted">
            Isso vai sobrescrever os arquivos do projeto pelos arquivos deste backup. Arquivos criados
            depois do backup (que não existiam nele) <strong>não são apagados</strong> — só os que
            existirem nos dois lugares são substituídos.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  );
}
