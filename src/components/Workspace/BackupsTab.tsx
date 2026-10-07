import { useState } from "react";
import { HardDriveDownload, RotateCcw, Settings, ShieldCheck, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import type { Backup } from "@/types/backup";
import { useBackups } from "@/hooks/useBackups";
import { Card } from "@/components/common/Card";
import { RestoreConfirmModal } from "./RestoreConfirmModal";

const TYPE_LABEL: Record<Backup["type"], string> = {
  manual: "Manual",
  automatic: "Automático",
  snapshot: "Snapshot",
  before_ai_session: "Antes da IA",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface BackupsTabProps {
  project: Project;
}

export function BackupsTab({ project }: BackupsTabProps) {
  const { backups, settings, loading, error, createNow, restore, remove, saveSettings } = useBackups(project.id);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0);
  const lastBackup = backups[0] ?? null;
  const protectedStatus = settings?.enabled && backups.length > 0;

  async function handleCreate() {
    setCreating(true);
    try {
      await createNow("manual");
    } finally {
      setCreating(false);
    }
  }

  async function handleRestoreConfirm() {
    if (!restoring) return;
    setRestoreError(null);
    try {
      await restore(restoring.id);
      setRestoring(null);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={`Backups — ${project.name}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="text-muted hover:text-slate-200"
              title="Configurações de backup"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || settings?.enabled === false}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <HardDriveDownload size={13} /> {creating ? "Criando..." : "Criar backup agora"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">Status</p>
            <p className={`mt-0.5 flex items-center gap-1 font-medium ${protectedStatus ? "text-success" : "text-muted"}`}>
              <ShieldCheck size={13} /> {protectedStatus ? "Protegido" : settings?.enabled ? "Sem backups ainda" : "Desativado"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Último backup</p>
            <p className="mt-0.5 text-slate-200">{lastBackup ? formatDateTime(lastBackup.createdAt) : "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Espaço utilizado</p>
            <p className="mt-0.5 text-slate-200">{formatSize(totalSize)}</p>
          </div>
        </div>

        {settingsOpen && settings && (
          <div className="mt-4 space-y-3 rounded-lg border border-border-subtle bg-base-800 p-3">
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Backup habilitado para este projeto</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  saveSettings({
                    enabled: e.target.checked,
                    beforeAiSession: settings.beforeAiSession,
                    retentionValue: settings.retentionValue,
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Oferecer snapshot antes de iniciar uma IA</span>
              <input
                type="checkbox"
                checked={settings.beforeAiSession}
                onChange={(e) =>
                  saveSettings({
                    enabled: settings.enabled,
                    beforeAiSession: e.target.checked,
                    retentionValue: settings.retentionValue,
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Manter quantos backups (mais antigos são apagados)</span>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.retentionValue}
                onChange={(e) =>
                  saveSettings({
                    enabled: settings.enabled,
                    beforeAiSession: settings.beforeAiSession,
                    retentionValue: Number(e.target.value) || 1,
                  })
                }
                className="w-16 rounded border border-border-subtle bg-base-850 px-2 py-1 text-right text-slate-200"
              />
            </label>
            <p className="text-[11px] text-muted">
              Destino: <span className="font-mono">{settings.destination}</span>
            </p>
          </div>
        )}
      </Card>

      <Card title={`Histórico (${backups.length})`}>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Carregando backups...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-danger">{error}</p>
        ) : backups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhum backup criado ainda.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-200">{formatDateTime(backup.createdAt)}</span>
                    <span className="rounded bg-base-700 px-1.5 py-0.5 text-[10px] text-muted">
                      {TYPE_LABEL[backup.type]}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {formatSize(backup.sizeBytes)} · {backup.fileCount} arquivos
                    {backup.branch ? ` · ${backup.branch}` : ""}
                    {backup.gitStatus ? ` · ${backup.gitStatus}` : ""}
                  </p>
                  {backup.reason && <p className="text-xs text-muted/70">{backup.reason}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setRestoreError(null);
                      setRestoring(backup);
                    }}
                    title="Restaurar"
                    className="rounded p-1.5 text-muted hover:bg-base-800 hover:text-accent"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => remove(backup.id)}
                    title="Excluir backup"
                    className="rounded p-1.5 text-muted hover:bg-base-800 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {restoring && (
        <RestoreConfirmModal
          backup={restoring}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setRestoring(null)}
        />
      )}
      {restoreError && (
        <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">Erro ao restaurar: {restoreError}</p>
      )}
    </div>
  );
}
