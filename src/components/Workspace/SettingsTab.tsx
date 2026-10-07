import { useEffect, useState } from "react";
import { FolderOpen, Link2, Save } from "lucide-react";
import type { Project, ProjectStatus } from "@/types/project";
import type { UpdateProjectFields } from "@/services/projects";
import { Card } from "@/components/common/Card";
import { pickProjectFolder } from "@/services/filesystem";

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "done", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
];

const PROVIDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Nenhum (perguntar sempre)" },
  { value: "codex", label: "Codex" },
  { value: "claude", label: "Claude Code" },
  { value: "ollama", label: "Ollama" },
];

interface SettingsTabProps {
  project: Project;
  onUpdate: (fields: Omit<UpdateProjectFields, "id">) => Promise<unknown>;
  onLinkFolder: (path: string) => Promise<unknown>;
}

export function SettingsTab({ project, onUpdate, onLinkFolder }: SettingsTabProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [defaultAiProvider, setDefaultAiProvider] = useState(project.defaultAiProvider ?? "");
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Se o usuario trocar de projeto selecionado, reseta o formulario para
  // refletir o projeto recem-selecionado em vez de manter edicoes antigas.
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? "");
    setStatus(project.status);
    setDefaultAiProvider(project.defaultAiProvider ?? "");
  }, [project.id, project.name, project.description, project.status, project.defaultAiProvider]);

  const dirty =
    name.trim() !== project.name ||
    (description.trim() || null) !== project.description ||
    status !== project.status ||
    (defaultAiProvider || null) !== project.defaultAiProvider;

  async function handleSave() {
    if (!name.trim()) {
      setError("O nome do projeto não pode ser vazio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdate({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        status,
        defaultAiProvider: defaultAiProvider || null,
      });
      setSavedTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkFolder() {
    const picked = await pickProjectFolder();
    if (!picked) return;
    setLinking(true);
    setLinkError(null);
    try {
      await onLinkFolder(picked);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Configurações do Projeto">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Pasta vinculada</label>
            {project.path ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-400">
                  <FolderOpen size={14} className="shrink-0 text-muted" />
                  <span className="truncate">{project.path}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted/70">
                  Mudar a pasta de um projeto não é suportado por aqui — crie um novo projeto se precisar apontar para outro caminho.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-3">
                  <p className="text-sm text-slate-300">
                    Este projeto ainda está na fase de ideia — sem pasta vinculada. Terminal, Git,
                    Arquivos, Qualidade e Backups ficam disponíveis depois de vincular uma pasta local.
                  </p>
                  <button
                    onClick={handleLinkFolder}
                    disabled={linking}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
                  >
                    <Link2 size={13} />
                    {linking ? "Vinculando..." : "Vincular pasta existente"}
                  </button>
                  {linkError && <p className="mt-2 text-xs text-danger">{linkError}</p>}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full resize-none rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">IA padrão</label>
              <select
                value={defaultAiProvider}
                onChange={(e) => setDefaultAiProvider(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 focus:outline-none"
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            {!dirty && savedTick > 0 && (
              <span className="text-xs text-success">Salvo.</span>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
