use std::fs;
use std::path::{Path, PathBuf};

use crate::filesystem::IGNORED_DIRS;

pub struct BackupResult {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub file_count: u64,
}

/// Abstracao para onde os backups sao guardados. Hoje so existe
/// `LocalBackupProvider`; no futuro um `CloudBackupProvider` poderia
/// implementar a mesma trait sem o resto do app precisar mudar.
pub trait BackupProvider {
    fn id(&self) -> &'static str;

    /// Copia `source` inteiro (menos o que estiver em `exclude`) para uma
    /// nova subpasta dentro de `destination_root`, nomeada com a data/hora.
    fn create_backup(
        &self,
        source: &Path,
        destination_root: &Path,
        exclude: &[String],
    ) -> Result<BackupResult, String>;

    /// Copia os arquivos do backup de volta para `target`. So SOBRESCREVE
    /// arquivos que existem no backup — nunca apaga arquivos que existem
    /// em `target` mas nao existem no backup (restauracao "por cima", nao
    /// espelhamento). Isso e deliberadamente mais conservador: evita
    /// apagar trabalho novo por engano.
    fn restore(&self, backup_path: &Path, target: &Path, exclude: &[String]) -> Result<(), String>;
}

pub struct LocalBackupProvider;

impl BackupProvider for LocalBackupProvider {
    fn id(&self) -> &'static str {
        "local"
    }

    fn create_backup(
        &self,
        source: &Path,
        destination_root: &Path,
        exclude: &[String],
    ) -> Result<BackupResult, String> {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let dest = destination_root.join(timestamp);
        fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

        let mut size_bytes = 0u64;
        let mut file_count = 0u64;
        copy_tree(source, &dest, exclude, &mut size_bytes, &mut file_count)?;

        Ok(BackupResult {
            path: dest,
            size_bytes,
            file_count,
        })
    }

    fn restore(&self, backup_path: &Path, target: &Path, exclude: &[String]) -> Result<(), String> {
        let mut ignored_size = 0u64;
        let mut ignored_count = 0u64;
        copy_tree(backup_path, target, exclude, &mut ignored_size, &mut ignored_count)?;
        Ok(())
    }
}

fn copy_tree(
    src: &Path,
    dst: &Path,
    exclude: &[String],
    size_bytes: &mut u64,
    file_count: &mut u64,
) -> Result<(), String> {
    let entries = fs::read_dir(src).map_err(|e| format!("erro lendo {}: {e}", src.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if path.is_dir() {
            if exclude.iter().any(|e| e == name_str.as_ref()) {
                continue;
            }
            let new_dst = dst.join(&name);
            fs::create_dir_all(&new_dst).map_err(|e| e.to_string())?;
            copy_tree(&path, &new_dst, exclude, size_bytes, file_count)?;
        } else {
            let new_dst = dst.join(&name);
            fs::copy(&path, &new_dst).map_err(|e| format!("erro copiando {}: {e}", path.display()))?;
            *file_count += 1;
            if let Ok(meta) = entry.metadata() {
                *size_bytes += meta.len();
            }
        }
    }
    Ok(())
}

/// Remove a pasta de um backup do disco (usado ao apagar manualmente ou
/// ao aplicar a politica de retencao).
pub fn delete_backup_folder(path: &Path) -> Result<(), String> {
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn default_exclude_patterns() -> Vec<String> {
    IGNORED_DIRS.iter().map(|s| s.to_string()).collect()
}

pub fn format_size(bytes: i64) -> String {
    let b = bytes as f64;
    if b < 1024.0 {
        format!("{b:.0} B")
    } else if b < 1024.0 * 1024.0 {
        format!("{:.1} KB", b / 1024.0)
    } else if b < 1024.0 * 1024.0 * 1024.0 {
        format!("{:.1} MB", b / 1024.0 / 1024.0)
    } else {
        format!("{:.2} GB", b / 1024.0 / 1024.0 / 1024.0)
    }
}
