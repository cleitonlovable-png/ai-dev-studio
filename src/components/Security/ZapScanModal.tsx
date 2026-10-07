import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { finishZapScan, getZapScanProgress, startZapScan } from "@/services/security";

interface ZapScanModalProps {
  projectId: number;
  onClose: () => void;
  onCompleted: () => void;
}

type Phase = "form" | "running" | "done" | "error";

export function ZapScanModal({ projectId, onClose, onCompleted }: ZapScanModalProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!authorized || !targetUrl.trim()) return;
    setError(null);
    setPhase("running");
    try {
      const zapScanId = await startZapScan(targetUrl.trim(), apiKey.trim() || null, authorized);
      pollRef.current = window.setInterval(async () => {
        try {
          const p = await getZapScanProgress(zapScanId);
          setProgress(p);
          if (p >= 100) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            await finishZapScan(projectId, targetUrl.trim());
            setPhase("done");
          }
        } catch (err) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setError(err instanceof Error ? err.message : String(err));
          setPhase("error");
        }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-base-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Scan ativo (OWASP ZAP)</h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {phase === "form" && (
          <form onSubmit={handleStart} className="space-y-4">
            <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p>
                Scans ativos enviam requisições reais contra o alvo. Só use em aplicações que você
                possui ou tem autorização explícita para testar.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">URL alvo</label>
              <input
                autoFocus
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://meusite.com.br"
                className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">API Key do ZAP (opcional)</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Deixe vazio se a API do ZAP não exigir chave"
                className="w-full rounded-lg border border-border-subtle bg-base-850 px-3 py-2 text-sm text-slate-200 placeholder:text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                className="mt-0.5"
              />
              Confirmo que tenho autorização para testar este alvo.
            </label>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-slate-200">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!authorized || !targetUrl.trim()}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Iniciar scan ativo
              </button>
            </div>
          </form>
        )}

        {phase === "running" && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-slate-300">Escaneando {targetUrl}...</p>
            <div className="h-2 overflow-hidden rounded-full bg-base-800">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted">{progress}%</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-success">Scan concluído! Resultados salvos no histórico.</p>
            <button
              onClick={onCompleted}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Ver resultados
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button onClick={onClose} className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-slate-200 hover:bg-base-800">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
