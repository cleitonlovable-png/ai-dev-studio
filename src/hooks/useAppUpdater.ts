import { useCallback, useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string; notes: string | null }
  | { kind: "downloading"; percent: number | null }
  | { kind: "error"; message: string };

/**
 * Atualização automática: checa o GitHub (latest.json da Release) ao abrir o
 * app e a cada 6 horas. Só baixa e instala quando o usuário clica em
 * "Atualizar agora" — nada é instalado sem aviso.
 */
export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({ kind: "idle" });
  const [version, setVersion] = useState<string | null>(null);
  const updateRef = useRef<Update | null>(null);

  const checkNow = useCallback(async (silent: boolean) => {
    if (!silent) setState({ kind: "checking" });
    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setState({ kind: "available", version: update.version, notes: update.body ?? null });
      } else if (!silent) {
        setState({ kind: "uptodate" });
      }
    } catch (err) {
      // Checagem automática falha em silêncio (sem internet, por exemplo);
      // só mostra erro quando o usuário pediu a verificação.
      if (!silent) setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const installNow = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    let total = 0;
    let done = 0;
    setState({ kind: "downloading", percent: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          done += event.data.chunkLength;
          setState({ kind: "downloading", percent: total > 0 ? Math.round((done / total) * 100) : null });
        }
      });
      await relaunch();
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
    const first = setTimeout(() => checkNow(true), 5000);
    const every = setInterval(() => checkNow(true), 6 * 60 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [checkNow]);

  return { state, version, checkNow: () => checkNow(false), installNow, dismiss: () => setState({ kind: "idle" }) };
}
