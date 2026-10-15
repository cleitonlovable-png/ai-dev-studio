import { useEffect, useState } from "react";
import { HardDriveDownload, RefreshCw } from "lucide-react";
import { listAllBackups } from "@/services/backups";
import type { BackupWithProject } from "@/types/backup";

const STATUS_LABEL: Record<string, string> = {
  pass: "OK",
  fail: "Falhou",
  running: "Em andamento",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Visao global de backups: agrega os backups mais recentes de TODOS os
 * projetos (comando `list_all_backups`), ja que esse item da sidebar nao
 * tem um projeto selecionado como contexto. A configuracao detalhada de
 * backup (destino, retencao, exclusoes) continua por projeto, na aba
 * "Backups" de cada projeto — aqui e so o painel de visao geral.
 */
export function BackupSyncView() {
  const [backups, setBackups] = useState<BackupWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBackups(await listAllBackups(50));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-center gap-2">
          <HardDriveDownload size={18} className="text-accent" />
          <div>
            <h1 className="text-base font-semibold text-slate-100">Backup e Sincronização</h1>
            <p className="text-xs text-muted">Backups recentes de todos os projetos, mais novos primeiro.</p>
          </div>
        </div>
        <button
          onClick={() => load()}
          title="Atualizar"
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-200 hover:bg-base-800"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Carregando backups...</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-danger">Erro ao carregar: {error}</p>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <HardDriveDownload size={28} className="text-muted" />
            <p className="text-sm text-slate-300">Nenhum backup ainda.</p>
            <p className="max-w-sm text-xs text-muted">
              Cada projeto pode criar backups automáticos ou manuais na própria aba "Backups".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-card border border-border-subtle bg-base-900 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{b.projectName}</p>
                  <p className="truncate text-xs text-muted">
                    {b.type} · {b.reason ?? "sem motivo registrado"} · {formatSize(b.sizeBytes)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span
                    className={
                      b.status === "fail"
                        ? "text-danger"
                        : b.status === "running"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                  <span className="text-muted">{new Date(b.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
