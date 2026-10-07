import { RefreshCw, ShieldAlert } from "lucide-react";
import { useSecurityReports } from "@/hooks/useSecurityReports";
import { SecurityReportCard } from "@/components/Security/SecurityReportCard";

export function SecurityReportsView() {
  const { reports, loading, error, remove, refresh } = useSecurityReports();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-accent" />
          <div>
            <h1 className="text-base font-semibold text-slate-100">Relatórios de Segurança</h1>
            <p className="text-xs text-muted">
              Recebidos automaticamente via webhook do SecureScan · endpoint local em{" "}
              <span className="font-mono">http://127.0.0.1:4567/webhooks/securescan</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => refresh()}
          title="Atualizar"
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-200 hover:bg-base-800"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Carregando relatórios...</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-danger">Erro ao carregar: {error}</p>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldAlert size={28} className="text-muted" />
            <p className="text-sm text-slate-300">Nenhum relatório recebido ainda.</p>
            <p className="max-w-sm text-xs text-muted">
              Configure o SecureScan para enviar um POST para o endpoint acima, com o header{" "}
              <span className="font-mono">Authorization: Bearer &lt;segredo&gt;</span> batendo com a
              variável de ambiente <span className="font-mono">SECURESCAN_WEBHOOK_SECRET</span> desta
              máquina.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <SecurityReportCard key={report.id} report={report} onDelete={remove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
