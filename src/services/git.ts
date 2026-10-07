import { invoke } from "@tauri-apps/api/core";
import type { GitCommit, GitStatus } from "@/types/git";

export async function getGitStatus(projectPath: string): Promise<GitStatus> {
  return invoke<GitStatus>("get_git_status", { projectPath });
}

export async function getGitDiff(projectPath: string, file: string): Promise<string | null> {
  return invoke<string | null>("get_git_diff", { projectPath, file });
}

export async function getGitLog(projectPath: string, limit = 20): Promise<GitCommit[]> {
  return invoke<GitCommit[]>("get_git_log", { projectPath, limit });
}
