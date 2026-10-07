import { useMemo, useState } from "react";
import { Archive, FolderOpen, HardDriveDownload, LayoutTemplate, Lightbulb, Search, Settings, ShieldAlert } from "lucide-react";
import type { CreateProjectInput, Project } from "@/types/project";
import type { CreateProjectFromScratchInput } from "@/services/projects";
import { ProjectListItem } from "./ProjectListItem";
import { NewProjectModal } from "./NewProjectModal";
import { NewFromScratchModal } from "./NewFromScratchModal";
import { SelectedProjectSummary } from "./SelectedProjectSummary";

interface SidebarProps {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (id: number) => void;
  onCreateProject: (input: CreateProjectInput) => Promise<void>;
  onCreateProjectFromScratch: (input: CreateProjectFromScratchInput) => Promise<void>;
  onOpenSecurityReports: () => void;
}

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onCreateProjectFromScratch,
  onOpenSecurityReports,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [scratchModalOpen, setScratchModalOpen] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.path ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  const activeProjects = filtered.filter((p) => p.status !== "archived");
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border-subtle bg-base-900">
      <div className="grid grid-cols-2 gap-2 p-4 pb-3">
        <button
          onClick={() => setScratchModalOpen(true)}
          title="Começar um projeto do zero — ideias, fluxograma, design system, sem pasta ainda"
          className="flex items-center justify-center gap-1.5 rounded-card bg-accent py-2.5 text-xs font-medium text-white hover:bg-accent-hover sm:text-sm"
        >
          <Lightbulb size={16} />
          Novo Projeto
        </button>
        <button
          onClick={() => setOpenModalOpen(true)}
          title="Abrir um projeto existente a partir de uma pasta local"
          className="flex items-center justify-center gap-1.5 rounded-card bg-base-700 py-2.5 text-xs font-medium text-slate-100 hover:bg-base-600 sm:text-sm"
        >
          <FolderOpen size={16} />
          Abrir Projeto
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-base-850 px-3 py-2">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projeto..."
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-muted/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Meus Projetos
        </span>
        <span className="text-xs text-muted">{projects.length}</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {activeProjects.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted">
            {projects.length === 0
              ? "Nenhum projeto ainda. Clique em 'Novo Projeto' para comecar."
              : "Nenhum projeto encontrado."}
          </p>
        )}
        {activeProjects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            active={project.id === selectedProjectId}
            onClick={() => onSelectProject(project.id)}
          />
        ))}
      </div>

      {selectedProject && <SelectedProjectSummary project={selectedProject} />}

      <div className="space-y-0.5 border-t border-border-subtle p-2">
        <SidebarFooterItem icon={<Archive size={16} />} label="Projetos Arquivados" badge={archivedCount} />
        <SidebarFooterItem icon={<LayoutTemplate size={16} />} label="Modelos de Projeto" />
        <SidebarFooterItem icon={<HardDriveDownload size={16} />} label="Backup e Sincronização" />
        <SidebarFooterItem icon={<ShieldAlert size={16} />} label="Relatórios de Segurança" onClick={onOpenSecurityReports} />
        <SidebarFooterItem icon={<Settings size={16} />} label="Configuracoes" />
      </div>

      <div className="mx-2 mb-2 rounded-card border border-border-subtle bg-base-850 p-3 text-center">
        <p className="text-xs italic leading-relaxed text-muted">
          "Grandes projetos começam com boas ideias e organização."
        </p>
      </div>

      {openModalOpen && (
        <NewProjectModal onClose={() => setOpenModalOpen(false)} onCreate={onCreateProject} />
      )}
      {scratchModalOpen && (
        <NewFromScratchModal
          onClose={() => setScratchModalOpen(false)}
          onCreate={onCreateProjectFromScratch}
        />
      )}
    </aside>
  );
}

function SidebarFooterItem({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted hover:bg-base-800 hover:text-slate-200"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="rounded-full bg-base-700 px-1.5 py-0.5 text-[10px] text-muted">
          {badge}
        </span>
      )}
    </button>
  );
}
