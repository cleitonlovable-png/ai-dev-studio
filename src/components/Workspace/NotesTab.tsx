import { useState } from "react";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import type { Note } from "@/types/note";
import { useNotes } from "@/hooks/useNotes";
import { Card } from "@/components/common/Card";
import { NoteModal } from "./NoteModal";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface NotesTabProps {
  project: Project;
}

export function NotesTab({ project }: NotesTabProps) {
  const { notes, loading, addNote, editNote, removeNote } = useNotes(project.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  return (
    <Card
      title={`Notas (${notes.length})`}
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
        <p className="py-8 text-center text-sm text-muted">Carregando notas...</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <NotebookPen size={22} className="text-muted" />
          <p className="text-sm text-muted">Nenhuma nota ainda.</p>
          <p className="text-xs text-muted/70">
            Use notas para rascunhos e lembretes livres — diferente da Memória, que é o contexto estruturado para a IA.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="group rounded-lg border border-border-subtle bg-base-800 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{note.title}</p>
                  {note.content && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{note.content}</p>
                  )}
                  <p className="mt-2 text-[11px] text-muted/70">Atualizada em {formatDate(note.updatedAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setEditing(note)} className="text-muted hover:text-slate-200">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(note.id)} className="text-muted hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <NoteModal onClose={() => setModalOpen(false)} onSave={(input) => addNote(input)} />
      )}
      {editing && (
        <NoteModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => editNote(editing.id, input)}
        />
      )}

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-slate-100">Excluir nota</h2>
            <p className="mb-4 text-sm text-muted">
              Esta ação não pode ser desfeita. A nota será removida permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await removeNote(confirmDeleteId);
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
    </Card>
  );
}
