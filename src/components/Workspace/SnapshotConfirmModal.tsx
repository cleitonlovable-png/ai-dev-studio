import { Camera } from "lucide-react";

interface SnapshotConfirmModalProps {
  label: string;
  onCreateAndContinue: () => void;
  onContinueWithout: () => void;
  onCancel: () => void;
}

export function SnapshotConfirmModal({
  label,
  onCreateAndContinue,
  onContinueWithout,
  onCancel,
}: SnapshotConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-2 flex items-center gap-2">
          <Camera size={18} className="text-accent" />
          <h2 className="text-base font-semibold text-slate-100">Criar ponto de restauração?</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Criar um backup do projeto antes de iniciar a sessão com <strong>{label}</strong>? Isso
          protege seu código caso algo dê errado.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onCreateAndContinue}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Criar snapshot e continuar
          </button>
          <button
            onClick={onContinueWithout}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-slate-200 hover:bg-base-800"
          >
            Continuar sem snapshot
          </button>
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-slate-200">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
