import { useState } from "react";
import { Bell, Brain, Moon, Search, ShieldAlert, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/hooks/useNotifications";

interface TopBarProps {
  onOpenSecurityReports: () => void;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function TopBar({ onOpenSecurityReports }: TopBarProps) {
  const { theme, toggle } = useTheme();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border-subtle bg-base-900 px-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-accent/15 p-1.5">
          <Brain size={18} className="text-accent" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-100">CSC Studio</p>
          <p className="text-[10px] text-muted">Seus projetos. Suas IAs. Mais resultados.</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-lg border border-border-subtle bg-base-850 px-3 py-1.5">
        <Search size={14} className="text-muted" />
        <input
          placeholder="Buscar projetos, arquivos, tarefas... (Ctrl + K)"
          className="w-full bg-transparent text-xs text-slate-200 placeholder:text-muted/60 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          className="text-muted hover:text-slate-200"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              markAllRead();
            }}
            className="relative text-muted hover:text-slate-200"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-9 z-50 w-80 overflow-hidden rounded-card border border-border-subtle bg-base-850 shadow-xl">
                <div className="border-b border-border-subtle px-3 py-2">
                  <p className="text-xs font-semibold text-slate-200">Notificações</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted">
                      Nenhuma notificação ainda. Relatórios de segurança recebidos via webhook aparecem aqui.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          onOpenSecurityReports();
                        }}
                        className="flex w-full items-start gap-2.5 border-b border-border-subtle px-3 py-2.5 text-left last:border-0 hover:bg-base-800"
                      >
                        <ShieldAlert size={14} className="mt-0.5 shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-200">
                            Novo relatório: {n.projectName}
                          </p>
                          <p className="text-[11px] text-muted">
                            {n.severityCritical > 0 && `${n.severityCritical} crítico(s) · `}
                            {n.severityHigh > 0 && `${n.severityHigh} alto(s) · `}
                            {timeAgo(n.receivedAt)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      onOpenSecurityReports();
                    }}
                    className="w-full border-t border-border-subtle px-3 py-2 text-center text-xs text-accent hover:bg-base-800"
                  >
                    Ver todos os relatórios
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
            U
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium text-slate-200">Você</p>
            <p className="text-[10px] text-muted">Desenvolvedor(a)</p>
          </div>
        </div>
      </div>
    </header>
  );
}
