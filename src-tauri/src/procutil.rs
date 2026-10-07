use std::path::PathBuf;

/// Procura `<name>.<ext>` (nessa ordem de extensoes) em cada diretorio do
/// PATH. So verifica exatamente as extensoes pedidas — NAO cai de volta
/// para o nome sem extensao, porque no Windows o `npm install -g` cria
/// tambem um shim sem extensao (script no formato Unix, pensado para
/// Git Bash/WSL) que passa em `.is_file()` mas nao e um executavel Win32
/// valido. Se o chamador quiser aceitar o nome sem extensao tambem, deve
/// incluir uma string vazia na lista de extensoes.
pub fn find_on_path(name: &str, extensions: &[&str]) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        for ext in extensions {
            let candidate = if ext.is_empty() {
                dir.join(name)
            } else {
                dir.join(format!("{name}.{ext}"))
            };
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}
