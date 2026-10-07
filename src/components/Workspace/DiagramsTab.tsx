import { useEffect, useState } from "react";
import { GitBranch, Plus, Save, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import type { Diagram } from "@/types/diagram";
import { useDiagrams } from "@/hooks/useDiagrams";
import { MermaidPreview } from "./MermaidPreview";

const EXAMPLE_SOURCE = `flowchart TD
    A[Usuário abre o app] --> B{Já tem conta?}
    B -- Sim --> C[Login]
    B -- Não --> D[Cadastro]
    C --> E[Tela inicial]
    D --> E
`;

interface DiagramsTabProps {
  project: Project;
}

export function DiagramsTab({ project }: DiagramsTabProps) {
  const { diagrams, loading, addDiagram, editDiagram, removeDiagram } = useDiagrams(project.id);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const selected = diagrams.find((d) => d.id === selectedId) ?? null;

  // Seleciona o primeiro diagrama automaticamente quando a lista carrega
  // (ou quando o selecionado atual deixa de existir, ex: apos excluir).
  useEffect(() => {
    if (diagrams.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!diagrams.some((d) => d.id === selectedId)) {
      setSelectedId(diagrams[0].id);
    }
  }, [diagrams, selectedId]);

  // Sincroniza o editor com o diagrama selecionado.
  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setSource(selected.mermaidSource);
    } else {
      setTitle("");
      setSource("");
    }
  }, [selected?.id]);

  const dirty = selected ? title !== selected.title || source !== selected.mermaidSource : false;

  async function handleCreate() {
    const created = await addDiagram({ title: "Novo diagrama", mermaidSource: EXAMPLE_SOURCE });
    if (created) setSelectedId(created.id);
  }

  async function handleSave() {
    if (!selected || !title.trim()) return;
    setSaving(true);
    try {
      await editDiagram(selected.id, { title: title.trim(), mermaidSource: source });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-56 shrink-0 flex-col gap-2">
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover"
        >
          <Plus size={13} /> Novo diagrama
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="px-2 py-4 text-center text-xs text-muted">Carregando...</p>
          ) : diagrams.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted">
              Nenhum diagrama ainda. Crie um fluxograma, mapa mental ou jornada do usuário.
            </p>
          ) : (
            diagrams.map((d: Diagram) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                  d.id === selectedId ? "bg-base-700 text-slate-100 ring-1 ring-accent/40" : "text-muted hover:bg-base-800 hover:text-slate-200"
                }`}
              >
                <GitBranch size={13} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(d.id);
                  }}
                  className="shrink-0 opacity-0 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm font-medium text-slate-100 focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!dirty || saving || !title.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              className="min-h-0 resize-none rounded-lg border border-border-subtle bg-base-850 p-3 font-mono text-xs text-slate-200 focus:border-accent focus:outline-none"
            />
            <MermaidPreview source={source} />
          </div>

          <p className="text-[11px] text-muted/70">
            Sintaxe Mermaid — ex: <code className="rounded bg-base-800 px-1">flowchart TD</code>,{" "}
            <code className="rounded bg-base-800 px-1">mindmap</code>,{" "}
            <code className="rounded bg-base-800 px-1">sequenceDiagram</code>. O preview atualiza
            ao digitar; "Salvar" grava no projeto.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          Crie um diagrama para começar.
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-slate-100">Excluir diagrama</h2>
            <p className="mb-4 text-sm text-muted">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await removeDiagram(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
