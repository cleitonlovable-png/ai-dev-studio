import { useState } from "react";
import type { AiProviderId } from "@/types/ai";
import type { Project } from "@/types/project";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { startAiProvider } from "@/services/ai";
import { startSession } from "@/services/sessions";
import { createBackupNow, getBackupSettings } from "@/services/backups";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

interface PendingSnapshotConfirm {
  providerId: AiProviderId;
  label: string;
  version: string | null;
}

/**
 * Lanca um provider de IA dentro da pasta do projeto: cria a sessao PTY
 * (Fase 4), registra uma linha em ai_sessions (Fase 5) e — se a
 * configuracao de backup estiver ligada — oferece criar um snapshot antes
 * de comecar (Fase 6). Nunca bloqueia o usuario: ele sempre pode escolher
 * continuar sem snapshot.
 */
export function useAiSessionLauncher(project: Project | null, onStarted: (session: ActiveAiSession) => void) {
  const [startingId, setStartingId] = useState<AiProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSnapshotConfirm, setPendingSnapshotConfirm] = useState<PendingSnapshotConfirm | null>(null);

  async function doLaunch(providerId: AiProviderId, label: string, version: string | null, withSnapshot: boolean) {
    if (!project) return;
    if (!project.path) {
      setError("Vincule uma pasta ao projeto antes de iniciar uma IA.");
      return;
    }
    setStartingId(providerId);
    try {
      if (withSnapshot) {
        try {
          await createBackupNow(project.id, "before_ai_session", `Antes de sessão com ${label}`, providerId);
        } catch {
          // Falha ao criar o snapshot nao deve impedir o usuario de
          // continuar — so significa que essa sessao nao tera backup.
        }
      }

      // Nunca deixa a UI "pendurada" para sempre: se o backend nao
      // responder em 20s (ex: travamento na criacao do PTY), mostra um
      // erro em vez de deixar o botao girando pra sempre.
      const ptySessionId = await withTimeout(
        startAiProvider(project.path!, providerId),
        20000,
        `Tempo esgotado ao iniciar ${label}. Verifique se o comando "${providerId}" está instalado e funcionando no terminal do sistema.`
      );

      let dbSessionId: number | null = null;
      try {
        const dbSession = await startSession(project.id, providerId, version);
        dbSessionId = dbSession.id;
      } catch {
        // idem: sessao PTY funciona normalmente mesmo se o registro falhar.
      }

      onStarted({
        sessionId: ptySessionId,
        label: `${label} — ${project.name}`,
        dbSessionId,
        provider: providerId,
      });
    } catch (err) {
      setError(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setStartingId(null);
    }
  }

  async function launch(providerId: AiProviderId, label: string, version: string | null) {
    if (!project) return;
    setError(null);

    try {
      const settings = await getBackupSettings(project.id);
      if (settings.enabled && settings.beforeAiSession) {
        setPendingSnapshotConfirm({ providerId, label, version });
        return;
      }
    } catch {
      // Se nao conseguir checar a configuracao, segue sem perguntar —
      // nunca trava o fluxo principal por causa do backup.
    }

    await doLaunch(providerId, label, version, false);
  }

  function confirmWithSnapshot() {
    if (!pendingSnapshotConfirm) return;
    const { providerId, label, version } = pendingSnapshotConfirm;
    setPendingSnapshotConfirm(null);
    doLaunch(providerId, label, version, true);
  }

  function confirmWithoutSnapshot() {
    if (!pendingSnapshotConfirm) return;
    const { providerId, label, version } = pendingSnapshotConfirm;
    setPendingSnapshotConfirm(null);
    doLaunch(providerId, label, version, false);
  }

  function cancelPending() {
    setPendingSnapshotConfirm(null);
  }

  return {
    launch,
    startingId,
    error,
    pendingSnapshotConfirm,
    confirmWithSnapshot,
    confirmWithoutSnapshot,
    cancelPending,
  };
}
