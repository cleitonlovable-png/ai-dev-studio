use serde::Serialize;

pub mod dependency_scanner;
pub mod secret_scanner;
pub mod zap_scanner;

/// Um finding pronto para ser inserido em `security_findings`. O campo
/// `project_id` e preenchido pelo comando que chama o scanner, nao pelo
/// scanner em si (o scanner so sabe escanear, nao sabe de banco).
#[derive(Debug, Clone)]
pub struct RawFinding {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub severity: String, // critical | high | medium | low | info
    pub remediation: Option<String>,
    pub endpoint_or_file: Option<String>,
    pub plugin_name: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScannerStatus {
    pub id: &'static str,
    pub label: String,
    pub available: bool,
    pub detail: Option<String>,
    /// Se true, a UI deve pedir confirmacao explicita (alvo autorizado +
    /// aviso) antes de rodar — usado por scanners que atingem sistemas
    /// externos (ex: OWASP ZAP), nunca por scanners puramente locais.
    pub requires_confirmation: bool,
}

/// Interface comum a qualquer scanner de seguranca. So `DependencyScanner`
/// e `SecretScanner` rodam automaticamente ao clicar "Executar" (sao
/// locais, sem alvo externo). `ZapScanner` exige um alvo autorizado
/// explicito e so roda via `start_active_scan`.
///
/// Os modulos concretos (dependency_scanner, secret_scanner, zap_scanner)
/// hoje expõem funcoes livres em vez de implementar esta trait
/// diretamente, porque cada um tem uma forma de operar bem diferente
/// (sincrono local vs. assincrono contra um alvo externo). A trait fica
/// aqui documentando o contrato que a Fase 8 do roadmap previu, para uma
/// futura unificacao (ex: um quinto scanner) ter um contrato claro a seguir.
#[allow(dead_code)]
pub trait SecurityScanner {
    fn id(&self) -> &'static str;
    fn label(&self) -> String;
}
