import { useEffect, useState } from "react";
import type { Project } from "@/types/project";
import type { ActiveAiSession } from "@/types/aiSessionState";
import type { UpdateProjectFields } from "@/services/projects";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { OverviewTab } from "./OverviewTab";
import { TasksTab } from "./TasksTab";
import { GitTab } from "./GitTab";
import { FilesTab } from "./FilesTab";
import { MemoryTab } from "./MemoryTab";
import { SessionsTab } from "./SessionsTab";
import { BackupsTab } from "./BackupsTab";
import { QualityTab } from "./QualityTab";
import { SecurityTab } from "./SecurityTab";
import { TimelineTab } from "./TimelineTab";
import { TerminalTab } from "./TerminalTab";
import { NotesTab } from "./NotesTab";
import { SettingsTab } from "./SettingsTab";
import { DiagramsTab } from "./DiagramsTab";
import { DesignSystemTab } from "./DesignSystemTab";
import { ComingSoonTab } from "./ComingSoonTab";

interface ProjectWorkspaceProps {
  project: Project;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  aiSession: ActiveAiSession | null;
  onCloseAiSession: () => void;
  onStartAiSession: (session: ActiveAiSession) => void;
  /** Incrementa toda vez que algo externo (ex: painel de IA) pede para
   * trazer o foco para a aba de Terminal. */
  focusTerminalTick: number;
  onUpdateProject: (fields: Omit<UpdateProjectFields, "id">) => Promise<unknown>;
  onLinkFolder: (path: string) => Promise<unknown>;
}

const TABS = [
  "Terminal",
  "Visão Geral",
  "Tarefas",
  "Arquivos",
  "Git",
  "Qualidade",
  "Segurança",
  "Timeline",
  "Sessões",
  "Memória",
  "Notas",
  "Fluxograma",
  "Design System",
  "Backups",
  "Configurações",
];

// Abas que dependem de uma pasta local real — indisponiveis enquanto o
// projeto estiver na fase de ideia/planejamento (path == null).
const FILESYSTEM_TABS = ["Terminal", "Arquivos", "Git", "Qualidade", "Backups"];

const TAB_PHASE: Record<string, string> = {};

export function ProjectWorkspace({
  project,
  onArchive,
  onDelete,
  aiSession,
  onCloseAiSession,
  onStartAiSession,
  focusTerminalTick,
  onUpdateProject,
  onLinkFolder,
}: ProjectWorkspaceProps) {
  const isDraft = !project.path;
  const [activeTab, setActiveTab] = useState(isDraft ? "Visão Geral" : "Terminal");

  // Quando uma IA e iniciada (ou "Abrir Terminal" e clicado) no painel da
  // direita, forca a aba Terminal a ficar visivel.
  useEffect(() => {
    if (focusTerminalTick > 0) setActiveTab("Terminal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTerminalTick]);

  // Se o usuario trocar para um projeto draft enquanto estava numa aba que
  // precisa de filesystem (ex: veio de outro projeto com Git ativo), traz
  // de volta para uma aba sempre disponivel.
  useEffect(() => {
    if (isDraft && FILESYSTEM_TABS.includes(activeTab)) {
      setActiveTab("Visão Geral");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, isDraft]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <WorkspaceHeader project={project} onArchive={onArchive} onDelete={onDelete} />
      <WorkspaceTabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        disabledTabs={isDraft ? FILESYSTEM_TABS : []}
        disabledReason="Vincule uma pasta ao projeto primeiro (aba Configurações)"
      />

      {activeTab === "Terminal" ? (
        <div className="min-h-0 flex-1">
          <TerminalTab project={project} aiSession={aiSession} onCloseAiSession={onCloseAiSession} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "Visão Geral" ? (
            <OverviewTab
              project={project}
              onOpenTasks={() => setActiveTab("Tarefas")}
              onOpenSessions={() => setActiveTab("Sessões")}
              onOpenQuality={() => setActiveTab("Qualidade")}
              onStartAiSession={onStartAiSession}
            />
          ) : activeTab === "Tarefas" ? (
            <TasksTab project={project} />
          ) : activeTab === "Git" ? (
            <GitTab project={project} />
          ) : activeTab === "Arquivos" ? (
            <FilesTab project={project} />
          ) : activeTab === "Qualidade" ? (
            <QualityTab project={project} />
          ) : activeTab === "Segurança" ? (
            <SecurityTab project={project} onStartAiSession={onStartAiSession} />
          ) : activeTab === "Timeline" ? (
            <TimelineTab project={project} />
          ) : activeTab === "Sessões" ? (
            <SessionsTab project={project} />
          ) : activeTab === "Memória" ? (
            <MemoryTab project={project} />
          ) : activeTab === "Backups" ? (
            <BackupsTab project={project} />
          ) : activeTab === "Notas" ? (
            <NotesTab project={project} />
          ) : activeTab === "Fluxograma" ? (
            <DiagramsTab project={project} />
          ) : activeTab === "Design System" ? (
            <DesignSystemTab project={project} />
          ) : activeTab === "Configurações" ? (
            <SettingsTab project={project} onUpdate={onUpdateProject} onLinkFolder={onLinkFolder} />
          ) : (
            <ComingSoonTab tabName={activeTab} phase={TAB_PHASE[activeTab] ?? "proxima fase"} />
          )}
        </div>
      )}
    </div>
  );
}
