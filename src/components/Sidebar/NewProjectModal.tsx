import { useState } from "react";
import { FolderOpen, X } from "lucide-react";
import { pickProjectFolder, suggestProjectName } from "@/services/filesystem";
import type { CreateProjectInput } from "@/types/project";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (input: CreateProjectInput) => Promise<void>;
}

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickFolder() {
    const picked = await pickProjectFolder();
    if (!picked) return;
    setPath(picked);
    if (!name) setName(suggestProjectName(picked));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setError("Nome e pasta do projeto sao obrigatorios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), path: path.trim(), description: description.trim() || null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Abrir Projeto</h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Pasta do projeto</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={path}
                placeholder="Selecione uma pasta local..."
                className="flex-1 rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60"
              />
              <button
                type="button"
                onClick={handlePickFolder}
                className="flex items-center gap-1.5 rounded-lg bg-base-700 px-3 py-2 text-sm text-slate-100 hover:bg-base-600"
              >
                <FolderOpen size={16} />
                Abrir
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Nome do projeto</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tiz-App"
              className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Descricao (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Do que se trata esse projeto?"
              className="w-full resize-none rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? "Abrindo..." : "Abrir Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
