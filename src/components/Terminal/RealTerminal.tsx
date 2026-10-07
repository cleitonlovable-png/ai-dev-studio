import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import type { ShellKind } from "@/types/terminal";
import { closeTerminal, createTerminal, resizeTerminal, writeTerminal } from "@/services/terminal";

type TerminalSource =
  | { type: "shell"; projectPath: string; shell: ShellKind }
  | { type: "attach"; sessionId: string };

interface RealTerminalProps {
  source: TerminalSource;
  /** Muda sempre que o usuario pede para reiniciar o terminal manualmente. */
  resetKey: number;
  /** Chamado quando o processo anexado encerra (ex: usuario saiu do `codex`). */
  onExit?: () => void;
}

interface TerminalDataEvent {
  sessionId: string;
  data: string;
}

/**
 * Um terminal PTY real. Pode criar uma sessao nova de shell (`source.type
 * === "shell"`) ou anexar numa sessao ja existente criada por outro
 * comando (`source.type === "attach"`, usado para sessoes de IA — Fase 4).
 * Em ambos os casos, fecha a sessao ao desmontar.
 */
export function RealTerminal({ source, resetKey, onExit }: RealTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let unlistenData: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let disposed = false;

    const term = new Terminal({
      convertEol: true,
      fontFamily: "JetBrains Mono, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: "#000000",
        foreground: "#d1d5db",
      },
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    async function boot() {
      try {
        const sessionId =
          source.type === "shell" ? await createTerminal(source.projectPath, source.shell) : source.sessionId;

        if (disposed) {
          // O componente foi desmontado enquanto a promise ainda corria.
          // So fecha se fomos NOS quem criou a sessao (attach nao "possui"
          // a sessao sozinho da mesma forma, mas fechar aqui tambem e
          // seguro: evita processo orfao).
          if (source.type === "shell") closeTerminal(sessionId).catch(() => {});
          return;
        }
        sessionIdRef.current = sessionId;

        unlistenData = await listen<TerminalDataEvent>("terminal://data", (event) => {
          if (event.payload.sessionId === sessionId) {
            term.write(event.payload.data);
          }
        });

        unlistenExit = await listen<{ sessionId: string }>("terminal://exit", (event) => {
          if (event.payload.sessionId === sessionId) {
            term.write("\r\n\x1b[90m[processo encerrado]\x1b[0m\r\n");
            onExit?.();
          }
        });

        term.onData((data) => {
          writeTerminal(sessionId, data).catch(() => {});
        });

        resizeTerminal(sessionId, term.rows, term.cols).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    boot();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (sessionIdRef.current) {
        resizeTerminal(sessionIdRef.current, term.rows, term.cols).catch(() => {});
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      unlistenData?.();
      unlistenExit?.();
      if (sessionIdRef.current) {
        closeTerminal(sessionIdRef.current).catch(() => {});
      }
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.type === "shell" ? source.projectPath : source.sessionId, source.type === "shell" ? source.shell : null, resetKey]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-danger">
        Erro ao iniciar o terminal: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full px-2 py-1" />;
}
