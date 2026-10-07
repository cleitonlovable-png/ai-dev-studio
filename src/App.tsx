import { TopBar } from "@/components/Layout/TopBar";
import { StatusBar } from "@/components/Layout/StatusBar";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { AIPanel } from "@/components/AIPanel/AIPanel";
import { ProjectWorkspace } from "@/components/Workspace/ProjectWorkspace";
import { EmptyWorkspace } from "@/components/Workspace/EmptyWorkspace";
import { SessionFinishModal } from "@/components/Workspace/SessionFinishModal";
import { SecurityReportsView } from "@/components/Security/SecurityReportsView";
import type { ActiveAiSession } from "@/types/aiSessionState";
import { useProjects } from "@/hooks/useProjects";
import { useState } from "react";
import { NewProjectModal } from "@/components/Sidebar/NewProjectModal";
import { finishSession, discardSession } from "@/services/sessions";
import { touchProjectOpened } from "@/services/projects";

const PROVIDER_LABELS: Record<string, string> = {
  codex: "Codex",
  claude: "Claude Code",
  ollama: "Ollama",
};

type View = "project" | "security-reports";

export default function App() {
  const {
    projects,
    selectedProject,
    loading,
    error,
    selectProject,
    addProject,
    addProjectFromScratch,
    linkFolder,
    removeProject,
    archiveProjectById,
    updateProjectFields,
  } = useProjects();
  const [view, setView] = useState<View>("project");
  const [emptyStateModalOpen, setEmptyStateModalOpen] = useState(false);
  const [aiSession, setAiSession] = useState<ActiveAiSession | null>(null);
  const [pendingFinish, setPendingFinish] = useState<ActiveAiSession | null>(null);
  const [focusTerminalTick, setFocusTerminalTick] = useState(0);

  function handleCloseAiSession() {
    setAiSession((current) => {
      if (current?.dbSessionId) setPendingFinish(current);
      return null;
    });
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base-950">
      <TopBar onOpenSecurityReports={() => setView("security-reports")} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          projects={projects}
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={(id) => {
            setAiSession(null);
            setView("project");
            selectProject(id);
            touchProjectOpened(id).catch(() => {});
          }}
          onCreateProject={async (input) => {
            await addProject(input);
          }}
          onCreateProjectFromScratch={async (input) => {
            await addProjectFromScratch(input);
          }}
          onOpenSecurityReports={() => setView("security-reports")}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {view === "security-reports" ? (
            <SecurityReportsView />
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Carregando projetos...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-danger">
              Erro ao carregar projetos: {error}
            </div>
          ) : selectedProject ? (
            <ProjectWorkspace
              project={selectedProject}
              onArchive={() => archiveProjectById(selectedProject.id)}
              onDelete={() => removeProject(selectedProject.id)}
              aiSession={aiSession}
              onCloseAiSession={handleCloseAiSession}
              onStartAiSession={(session) => {
                setAiSession(session);
                setFocusTerminalTick((t) => t + 1);
              }}
              focusTerminalTick={focusTerminalTick}
              onUpdateProject={(fields) => updateProjectFields({ id: selectedProject.id, ...fields })}
              onLinkFolder={(path) => linkFolder(selectedProject.id, path)}
            />
          ) : (
            <EmptyWorkspace onNewProject={() => setEmptyStateModalOpen(true)} />
          )}
        </main>

        {view === "project" && (
          <AIPanel
            project={selectedProject}
            onOpenTerminal={() => setFocusTerminalTick((t) => t + 1)}
            onStartAiSession={(session) => {
              setAiSession(session);
              setFocusTerminalTick((t) => t + 1);
            }}
          />
        )}
      </div>

      <StatusBar />

      {emptyStateModalOpen && (
        <NewProjectModal
          onClose={() => setEmptyStateModalOpen(false)}
          onCreate={async (input) => {
            await addProject(input);
          }}
        />
      )}

      {pendingFinish && pendingFinish.dbSessionId && (
        <SessionFinishModal
          providerLabel={PROVIDER_LABELS[pendingFinish.provider] ?? pendingFinish.provider}
          onSave={async (summary, nextStep) => {
            await finishSession(pendingFinish.dbSessionId!, summary || null, nextStep || null);
            setPendingFinish(null);
          }}
          onDiscard={async () => {
            await discardSession(pendingFinish.dbSessionId!);
            setPendingFinish(null);
          }}
        />
      )}
    </div>
  );
}
