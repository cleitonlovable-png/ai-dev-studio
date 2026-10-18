import { Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/**
 * Configuracoes globais do app (nao de um projeto especifico — essas ficam
 * na aba "Configurações" de cada projeto). Por enquanto cobre o tema;
 * cresce aqui conforme mais preferencias globais forem adicionadas.
 */
export function GlobalSettingsView() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border-subtle px-6 py-4">
        <Settings size={18} className="text-accent" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Configurações</h1>
          <p className="text-xs text-muted">Preferências gerais do CSC Studio.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between rounded-card border border-border-subtle bg-base-900 p-4">
            <div>
              <p className="text-sm font-medium text-slate-100">Tema</p>
              <p className="text-xs text-muted">Alterna entre os temas claro e escuro.</p>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-200 hover:bg-base-800"
            >
              {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
              {theme === "dark" ? "Escuro" : "Claro"}
            </button>
          </div>

          <div className="rounded-card border border-border-subtle bg-base-900 p-4">
            <p className="text-sm font-medium text-slate-100">Configurações por projeto</p>
            <p className="mt-1 text-xs text-muted">
              Nome, descrição, status, IA padrão e webhook de segurança ficam na aba{" "}
              <span className="font-medium text-slate-300">"Configurações"</span> de cada projeto aberto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
