import { useState } from "react";
import { Brain, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import type { Memory, MemoryCategory } from "@/types/memory";
import { useMemories } from "@/hooks/useMemories";
import { Card } from "@/components/common/Card";
import { MemoryModal } from "./MemoryModal";

const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  decision: "Decisão",
  architecture: "Arquitetura",
  rule: "Regra",
  known_bug: "Bug conhecido",
  pending: "Pendência",
  context: "Contexto",
  important: "Importante",
};

const CATEGORY_STYLE: Record<MemoryCategory, string> = {
  decision: "bg-accent/15 text-accent",
  architecture: "bg-accent/15 text-accent",
  rule: "bg-warning/15 text-warning",
  known_bug: "bg-danger/15 text-danger",
  pending: "bg-warning/15 text-warning",
  context: "bg-muted/15 text-muted",
  important: "bg-success/15 text-success",
};

interface MemoryTabProps {
  project: Project;
}

export function MemoryTab({ project }: MemoryTabProps) {
  const { memories, loading, addMemory, editMemory, removeMemory } = useMemories(project.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);

  return (
    <Card
      title={`Memória do Projeto (${memories.length})`}
      action={
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
        >
          <Plus size={12} /> Nova
        </button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Carregando memória...</p>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Brain size={22} className="text-muted" />
          <p className="text-sm text-muted">Nenhuma memória registrada ainda.</p>
          <p className="text-xs text-muted/70">
            Registre decisões, regras e contexto que qualquer IA deveria saber sobre este projeto.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((memory) => (
            <div key={memory.id} className="group rounded-lg border border-border-subtle bg-base-800 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-100">{memory.title}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[memory.category as MemoryCategory]}`}>
                      {CATEGORY_LABEL[memory.category as MemoryCategory] ?? memory.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{memory.content}</p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setEditing(memory)} className="text-muted hover:text-slate-200">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => removeMemory(memory.id)} className="text-muted hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <MemoryModal
          onClose={() => setModalOpen(false)}
          onSave={(input) => addMemory(input)}
        />
      )}
      {editing && (
        <MemoryModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => editMemory(editing.id, input)}
        />
      )}
    </Card>
  );
}
