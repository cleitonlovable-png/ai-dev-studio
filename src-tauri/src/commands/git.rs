use crate::git::{self, GitCommit, GitStatus};

#[tauri::command(async)]
pub fn get_git_status(project_path: String) -> GitStatus {
    git::get_status(&project_path)
}

#[tauri::command(async)]
pub fn get_git_diff(project_path: String, file: String) -> Option<String> {
    git::get_diff(&project_path, &file)
}

#[tauri::command(async)]
pub fn get_git_log(project_path: String, limit: Option<u32>) -> Vec<GitCommit> {
    git::get_log(&project_path, limit.unwrap_or(20))
}
