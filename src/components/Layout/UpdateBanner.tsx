import { Download, X } from "lucide-react";
import type { UpdaterState } from "@/hooks/useAppUpdater";

interface Props {
  state: UpdaterState;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ state, onInstall, onDismiss }: Props) {
  if (state.kind !== "available" && state.kind !== "downloading" && state.kind !== "error") return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-slate-200">
      <div className="flex min-w-0 items-center gap-2">
        <Download size={14} className="shrink-0 text-accent" />
        {state.kind === "available" && (
          <span className="truncate">
            Nova versão <strong>{state.version}</strong> disponível. O app reinicia sozinho depois de atualizar.
          </span>
        )}
        {state.kind === "downloading" && (
          <span>Baixando atualização{state.percent !== null ? `… ${state.percent}%` : "…"} Não feche o app.</span>
        )}
        {state.kind === "error" && (
          <span className="truncate text-danger">Não foi possível atualizar: {state.message}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state.kind === "available" && (
          <button onClick={onInstall} className="rounded-lg bg-accent px-3 py-1 font-medium text-white hover:bg-accent-hover">
            Atualizar agora
          </button>
        )}
        {state.kind !== "downloading" && (
          <button onClick={onDismiss} title="Fechar" className="text-muted hover:text-slate-200">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
