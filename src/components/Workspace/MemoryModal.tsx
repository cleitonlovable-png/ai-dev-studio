import { useState } from "react";
import { X } from "lucide-react";
import type { Memory, MemoryCategory } from "@/types/memory";

const CATEGORY_OPTIONS: Array<{ value: MemoryCategory; label: string }> = [
  { value: "decision", label: "Decisão" },
  { value: "architecture", label: "Arquitetura" },
  { value: "rule", label: "Regra" },
  { value: "known_bug", label: "Bug conhecido" },
  { value: "pending", label: "Pendência" },
  { value: "context", label: "Contexto" },
  { value: "important", label: "Informação importante" },
];

interface MemoryModalProps {
  initial?: Memory;
  onClose: () => void;
  onSave: (input: { title: string; content: string; category: MemoryCategory }) => Promise<void>;
}

export function MemoryModal({ initial, onClose, onSave }: MemoryModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState<MemoryCategory>(initial?.category ?? "context");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), category });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            {initial ? "Editar memória" : "Nova memória"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Título</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Autenticação usa Supabase"
              className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Detalhes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Ex: Não modificar a migration X. Checkout usa Asaas."
              className="w-full resize-none rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
