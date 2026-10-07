import { useCallback, useEffect, useState } from "react";
import type { CreateProjectInput, Project } from "@/types/project";
import {
  archiveProject,
  createProject,
  createProjectFromScratch,
  deleteProject,
  linkProjectFolder,
  listProjects,
  updateProject,
} from "@/services/projects";
import type { CreateProjectFromScratchInput, UpdateProjectFields } from "@/services/projects";

interface UseProjectsResult {
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;
  selectProject: (id: number) => void;
  addProject: (input: CreateProjectInput) => Promise<Project>;
  addProjectFromScratch: (input: CreateProjectFromScratchInput) => Promise<Project>;
  linkFolder: (projectId: number, path: string) => Promise<Project>;
  removeProject: (id: number) => Promise<void>;
  archiveProjectById: (id: number) => Promise<void>;
  updateProjectFields: (fields: UpdateProjectFields) => Promise<Project>;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects();
      setProjects(data);
      // Mantem a selecao atual se ainda existir; senao seleciona o primeiro.
      setSelectedId((current) => {
        if (current !== null && data.some((p) => p.id === current)) {
          return current;
        }
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProject = useCallback(
    async (input: CreateProjectInput) => {
      const created = await createProject(input);
      await refresh();
      setSelectedId(created.id);
      return created;
    },
    [refresh]
  );

  const addProjectFromScratch = useCallback(
    async (input: CreateProjectFromScratchInput) => {
      const created = await createProjectFromScratch(input);
      await refresh();
      setSelectedId(created.id);
      return created;
    },
    [refresh]
  );

  const linkFolder = useCallback(
    async (projectId: number, path: string) => {
      const updated = await linkProjectFolder(projectId, path);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const selectProject = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const removeProject = useCallback(
    async (id: number) => {
      await deleteProject(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [refresh, selectedId]
  );

  const archiveProjectById = useCallback(
    async (id: number) => {
      await archiveProject(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [refresh, selectedId]
  );

  const updateProjectFields = useCallback(
    async (fields: UpdateProjectFields) => {
      const updated = await updateProject(fields);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  return {
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
    refresh,
  };
}
