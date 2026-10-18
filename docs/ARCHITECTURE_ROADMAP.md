# CSC Studio — Arquitetura Expandida & Roadmap

**Status:** documento de planejamento. Nada aqui foi implementado ainda —
é a base para decidirmos juntos o que construir a seguir, fase por fase.

**Princípio que não muda:** o projeto pertence ao CSC Studio, não à IA
usada no momento. Codex, Claude Code, Ollama, scanners de segurança e
ferramentas de qualidade são todos **providers conectados**, plugáveis e
substituíveis — nunca o centro da arquitetura.

---

## 1. O que já existe (Fase 1, revisado)

```
Frontend (React/TS)                  Backend (Rust/Tauri)
├── components/                      ├── commands/
│   ├── Layout/TopBar                │   └── projects.rs   (list/create/touch)
│   ├── Sidebar/ (lista, busca,      ├── database/
│   │   novo projeto)                │   └── mod.rs        (SQLite: tabela projects)
│   ├── Workspace/ (header, abas,    ├── providers/        (vazio, reservado)
│   │   Visão Geral funcional,       ├── security/         (vazio, reservado)
│   │   demais abas "em breve")      ├── filesystem/        (vazio, reservado)
│   ├── AIPanel/ (estático)          └── main.rs
│   └── Terminal/ (mock visual)
├── hooks/useProjects.ts
├── services/{projects,filesystem}.ts
└── types/{project,ai}.ts
```

Só existe **uma tabela** (`projects`) e **um domínio de comando**
(`commands::projects`). Isso é bom: significa que ainda não há nada
acoplado que os módulos novos precisem contornar. É o melhor momento
para fixar os padrões que os módulos seguintes vão repetir.

---

## 2. Arquitetura proposta (visão geral)

Três adições estruturais, todas aditivas (não quebram o que existe):

1. **Barramento de eventos interno** (Rust → frontend via eventos do
   Tauri). Isso é citado no seu documento como item 25 e é o que permite
   Backup, Health, Quality e Security "conversarem" sem se acoplarem
   entre si nem ao core de projetos.
2. **Camada central de segurança de comandos** (`security::classify`),
   usada por *qualquer* módulo que rode um processo externo (terminal,
   scanners, git, testes). Um único lugar decide `SAFE` /
   `CONFIRMATION_REQUIRED` / `BLOCKED` — Backup, Quality e Security
   Center todos passam por ali em vez de reimplementar a regra.
3. **Padrão de "Provider" repetido três vezes**: `AIProvider` (já
   previsto), `BackupProvider` (novo) e `SecurityScanner` (novo). Os
   três seguem a mesma forma (`detect/isAvailable/getVersion/...`) de
   propósito — quem entender um, entende os outros três.

```
                     ┌─────────────────────┐
                     │   Frontend (React)  │
                     │  ouve eventos Tauri  │
                     └──────────▲───────────┘
                                │ tauri::Emitter
┌───────────────┐   ┌──────────┴───────────┐   ┌──────────────────┐
│  AIProvider    │   │   Event Bus (Rust)   │   │  BackupProvider   │
│  (Codex/       │──▶│  PROJECT_OPENED       │◀──│  (Local, depois   │
│  Claude/Ollama)│   │  AI_SESSION_STARTED   │   │   Cloud)          │
└───────────────┘   │  BACKUP_CREATED       │   └──────────────────┘
                     │  BUILD_FINISHED       │
┌───────────────┐    │  TEST_FINISHED        │   ┌──────────────────┐
│ SecurityScanner│──▶│  SECURITY_SCAN_*       │◀──│  security::       │
│ (ZAP/Checkmarx/│    │  FINDING_CREATED       │   │  classify()        │
│  Dependency)   │    └──────────┬────────────┘   │  (SAFE/CONFIRM/    │
└───────────────┘               │                 │   BLOCKED)         │
                                 ▼                 └──────────────────┘
                     ┌──────────────────────┐
                     │  SQLite (por projeto) │
                     │  projects, backups,   │
                     │  checks, findings...  │
                     └──────────────────────┘
```

---

## 3. Estrutura de diretórios atualizada

```
src/                                  src-tauri/src/
├── components/                       ├── commands/
│   ├── Layout/                       │   ├── projects.rs
│   ├── Sidebar/                      │   ├── backups.rs          (novo, Fase 6)
│   ├── Workspace/                    │   ├── health.rs           (novo, Fase 7)
│   │   └── tabs/                     │   ├── quality.rs          (novo, Fase 7)
│   │       ├── BackupsTab.tsx        │   └── security.rs         (novo, Fase 8)
│   │       ├── HealthTab.tsx         ├── database/
│   │       └── SecurityTab.tsx       │   ├── mod.rs              (conexao + migracoes)
│   ├── AIPanel/                      │   └── schema/
│   ├── Terminal/                     │       ├── 0001_projects.sql
│   └── Timeline/                     │       ├── 0002_backups.sql        (novo)
│       └── EventTimeline.tsx         │       ├── 0003_health.sql         (novo)
├── features/                         │       └── 0004_security.sql       (novo)
│   ├── backups/                      ├── providers/
│   │   ├── types.ts                  │   ├── mod.rs   (trait AiProvider)
│   │   └── hooks/useBackups.ts       │   ├── codex.rs / claude.rs / ollama.rs  (Fase 4)
│   ├── health/                       │   └── backup/
│   ├── quality/                      │       ├── mod.rs (trait BackupProvider)
│   ├── security/                     │       └── local.rs
│   └── events/                       ├── security/
│       └── useEventTimeline.ts       │   ├── classify.rs (SAFE/CONFIRM/BLOCKED)
├── services/                          │   └── scanners/
│   ├── backups.ts                     │       ├── mod.rs (trait SecurityScanner)
│   ├── health.ts                      │       ├── zap.rs
│   ├── quality.ts                     │       ├── checkmarx.rs
│   └── security.ts                    │       ├── dependency_scanner.rs
└── types/                              │       └── secret_scanner.rs
    ├── backup.ts                       ├── events/
    ├── health.ts                       │   └── mod.rs (enum AppEvent + emit helpers)
    └── security.ts                     └── filesystem/  (Fase 2: deteccao de stack)
```

Nenhum arquivo existente muda de lugar. Só estamos adicionando pastas
irmãs às que já existem — zero refatoração forçada.

---

## 4. Estrutura de banco de dados proposta

Cada tabela nova referencia `project_id`, seguindo o padrão de
`projects` que já existe. Tipos como `SQLite TEXT` para enums (mais
simples de migrar depois do que `INTEGER` com mapeamento manual).

```sql
-- já existe
CREATE TABLE projects (...);

-- Fase 6: Backup Center
CREATE TABLE backups (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id),
    type            TEXT NOT NULL,   -- MANUAL | AUTOMATIC | SNAPSHOT | BEFORE_AI_SESSION | ...
    reason          TEXT,
    path            TEXT NOT NULL,
    size_bytes      INTEGER,
    status          TEXT NOT NULL,   -- PASS | FAIL | RUNNING
    provider        TEXT,            -- ex: "codex" quando reason = BEFORE_AI_SESSION
    branch          TEXT,
    git_status      TEXT,            -- resumo textual ("3 arquivos modificados")
    file_count      INTEGER,
    metadata        TEXT,            -- JSON livre p/ extensibilidade
    created_at      TEXT NOT NULL
);

CREATE TABLE backup_settings (
    project_id          INTEGER PRIMARY KEY REFERENCES projects(id),
    enabled             INTEGER NOT NULL DEFAULT 1,
    automatic_backup    INTEGER NOT NULL DEFAULT 0,
    before_ai_session   INTEGER NOT NULL DEFAULT 1,
    daily_backup        INTEGER NOT NULL DEFAULT 0,
    retention_type      TEXT NOT NULL DEFAULT 'count',  -- 'count' | 'days'
    retention_value     INTEGER NOT NULL DEFAULT 10,
    destination         TEXT,
    exclude_patterns    TEXT   -- JSON array: ["node_modules", ".venv", ...]
);

-- Fase 7: Project Health / Quality Center
CREATE TABLE project_checks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id),
    type            TEXT NOT NULL,  -- 'build' | 'test' | 'lint'
    tool            TEXT,           -- 'npm' | 'cargo' | 'pytest' | ...
    command         TEXT NOT NULL,  -- comando detectado, nunca inventado
    started_at      TEXT,
    finished_at     TEXT,
    status          TEXT NOT NULL,  -- PASS | WARNING | FAIL | NOT_CHECKED | RUNNING | UNKNOWN
    exit_code       INTEGER,
    summary         TEXT,
    output_path     TEXT            -- log completo salvo em arquivo, nao no banco
);

-- Fase 8: Security Center
CREATE TABLE security_findings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id          INTEGER NOT NULL REFERENCES projects(id),
    scanner             TEXT NOT NULL,   -- 'zap' | 'checkmarx' | 'dependency' | 'secret'
    severity            TEXT NOT NULL,   -- CRITICAL | HIGH | MEDIUM | LOW | INFO
    title               TEXT NOT NULL,
    description         TEXT,
    file                TEXT,
    line                INTEGER,
    status              TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | REVIEWING | FALSE_POSITIVE | RESOLVED | ACCEPTED_RISK
    created_at          TEXT NOT NULL,
    resolved_at         TEXT,
    external_reference  TEXT
);

-- Fase 5 (ja planejada no doc original, incluida aqui p/ completude)
CREATE TABLE project_memories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL, -- decisao | arquitetura | regra | bug_conhecido | pendencia | contexto | info
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE ai_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    provider    TEXT NOT NULL,
    model       TEXT,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    summary     TEXT,
    next_step   TEXT,
    status      TEXT NOT NULL  -- RUNNING | FINISHED
);

-- Timeline (item 24/25): guarda TODOS os eventos, de qualquer modulo
CREATE TABLE project_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id),
    event_type  TEXT NOT NULL,   -- 'BACKUP_CREATED', 'AI_SESSION_STARTED', ...
    payload     TEXT,            -- JSON com detalhes do evento
    created_at  TEXT NOT NULL
);
```

**Decisão de design:** `project_events` é a tabela que alimenta a
Timeline (item 24). Todo módulo (backup, health, quality, security, AI)
apenas *emite* um evento Rust (`AppEvent`); um único listener central
grava a linha em `project_events` e reenvia pro frontend. Os módulos
nunca escrevem na tabela de eventos diretamente — assim a Timeline fica
automaticamente completa sem cada módulo precisar lembrar de logar.

---

## 5. Interfaces principais

### 5.1 `AIProvider` (já prevista no doc original, formalizando em Rust)

```rust
// src-tauri/src/providers/mod.rs
pub trait AiProvider {
    fn id(&self) -> &'static str;              // "codex" | "claude" | "ollama"
    fn detect(&self) -> bool;                   // comando existe no PATH?
    fn get_version(&self) -> Option<String>;
    fn is_available(&self) -> bool;             // detect() + healthcheck (ex: Ollama HTTP)
    fn start(&self, project_path: &str) -> Result<ProcessHandle, String>;
    fn stop(&self, handle: &ProcessHandle) -> Result<(), String>;
    fn send_command(&self, handle: &ProcessHandle, cmd: &str) -> Result<(), String>;
    fn get_status(&self, handle: &ProcessHandle) -> ProviderStatus;
}
```

### 5.2 `BackupProvider` (novo)

```rust
// src-tauri/src/providers/backup/mod.rs
pub trait BackupProvider {
    fn id(&self) -> &'static str;               // "local" | "cloud" (futuro)
    fn is_available(&self) -> bool;
    fn create_backup(&self, req: CreateBackupRequest) -> Result<BackupRecord, String>;
    fn list_backups(&self, project_id: i64) -> Result<Vec<BackupRecord>, String>;
    fn restore(&self, backup_id: i64, scope: RestoreScope) -> Result<RestoreReport, String>;
    fn compare(&self, backup_id: i64) -> Result<BackupDiff, String>;
    fn apply_retention(&self, project_id: i64, policy: &RetentionPolicy) -> Result<Vec<i64>, String>; // ids removidos
}

pub enum RestoreScope { FullProject, Folder(String), Files(Vec<String>) }
```

`LocalBackupProvider` implementa isso hoje copiando arquivos para
`destination` respeitando `exclude_patterns`. Um `FutureCloudBackupProvider`
implementa a mesma trait depois — nada no resto do app muda.

### 5.3 `SecurityScanner` (novo)

```rust
// src-tauri/src/security/scanners/mod.rs
pub trait SecurityScanner {
    fn id(&self) -> &'static str;                // "zap" | "checkmarx" | "dependency" | "secret"
    fn detect(&self) -> bool;
    fn is_available(&self) -> bool;
    fn get_version(&self) -> Option<String>;
    fn run(&self, target: ScanTarget) -> Result<ScanHandle, String>;  // sempre acao explicita do usuario
    fn cancel(&self, handle: &ScanHandle) -> Result<(), String>;
    fn parse_results(&self, raw_output: &str) -> Vec<SecurityFinding>;
    fn get_status(&self, handle: &ScanHandle) -> ScanStatus;
}
```

`DependencyScanner` e `SecretScanner` são os mais simples de entregar
primeiro (rodam local, sem alvo de rede — baixo risco). `ZapScanner` e
`CheckmarxScanner` exigem confirmação explícita e aviso antes de rodar,
por poderem atingir sistemas externos.

### 5.4 Camada central de segurança de comandos

```rust
// src-tauri/src/security/classify.rs
pub enum CommandRisk { Safe, ConfirmationRequired, Blocked }

pub fn classify(command: &Command) -> CommandRisk {
    // regras fixas, nao configuraveis pelo usuario nem por IA:
    // - "git push --force", "git reset --hard", "git clean" => Blocked
    // - restaurar backup, rodar scanner ativo (zap), instalar deps,
    //   migration => ConfirmationRequired
    // - git status, listar dir, checar versao => Safe
}
```

Todo módulo que dispara um processo (terminal, scanner, backup restore,
build/test) passa pelo `classify()` antes de executar. Isso é o que
implementa os itens 26/27 do seu documento sem cada módulo reinventar a
regra.

---

## 6. Arquitetura de eventos

```rust
// src-tauri/src/events/mod.rs
#[derive(Serialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum AppEvent {
    ProjectOpened { project_id: i64 },
    BackupCreated { project_id: i64, backup_id: i64, reason: String },
    BackupRestored { project_id: i64, backup_id: i64 },
    AiSessionStarted { project_id: i64, provider: String },
    AiSessionFinished { project_id: i64, session_id: i64 },
    FileChanged { project_id: i64, path: String },
    GitStatusChanged { project_id: i64 },
    BuildFinished { project_id: i64, status: String },
    TestFinished { project_id: i64, status: String, passed: u32, total: u32 },
    SecurityScanFinished { project_id: i64, scanner: String, findings: u32 },
    FindingCreated { project_id: i64, finding_id: i64, severity: String },
}

pub fn emit(app: &tauri::AppHandle, event: AppEvent) {
    // 1. grava uma linha em project_events (fonte da Timeline)
    // 2. app.emit("app://event", &event) para o frontend atualizar em tempo real
}
```

No frontend, um hook único (`useEventTimeline`) escuta `app://event` e
atualiza qualquer painel interessado (Timeline, card de Saúde do
Projeto, badge de "novo finding" etc.) sem que os componentes precisem
saber uns dos outros.

---

## 7. Riscos técnicos identificados

| Risco | Onde aparece | Mitigação proposta |
|---|---|---|
| Backup local pode ficar gigante rapidamente | Backup Center | `exclude_patterns` com defaults sensatos (node_modules, target, dist...) + mostrar tamanho antes de confirmar, nunca excluir nada sem o usuário ver a lista |
| Restaurar backup por engano sobrescreve trabalho não salvo | Restauração | Sempre exigir diff/preview antes (item 8), nunca restaurar automático, sugerir criar backup do estado atual antes de restaurar |
| Scanner de segurança (ZAP) atingir um alvo que não é do usuário | Security Center | Campo obrigatório "alvo autorizado", aviso explícito antes de qualquer scan ativo, nunca disparar sozinho |
| IA sugerir correção e o app achar que o problema já foi resolvido | Findings + IA | Status `RESOLVED` só é setado por reexecução do scanner/teste, nunca automaticamente por uma edição de código |
| Eventos demais gerando ruído/lentidão na Timeline | Arquitetura de eventos | Paginar `project_events`, permitir filtrar por tipo, não emitir evento por linha para `FileChanged` (agregar por "sessão de alterações") |
| Crescimento do schema SQLite sem controle de migração | Banco de dados | Adotar migrações numeradas (`schema/0001_...sql`, `0002_...sql`) desde já, aplicadas em ordem no `init_connection` — evita "ALTER TABLE" manual e esquecido |
| `SecurityScanner`/`BackupProvider` viraem 10 implementações inconsistentes | Providers | Trait bem definida agora (Seção 5) antes de escrever a primeira implementação concreta além do stub Local |
| Rust no Windows exige toolchain C++ (já mapeado na Fase 1) | Geral | Já documentado no README; sem risco novo introduzido por esses módulos |

---

## 8. Roadmap por fases (com sua ordem, detalhada)

| Fase | Módulo | Depende de | Prioridade | Entrega mínima |
|---|---|---|---|---|
| 1 ✅ | Core (projetos, SQLite, layout) | — | — | Feito |
| 2 | Git status, detecção de stack, arquivos recentes | Fase 1 | Alta | Aba "Git" e "Arquivos" com dados reais |
| 3 | Terminal integrado (PTY) | Fase 1 | Média | Terminal real substitui o mock |
| 4 | Providers de IA (Codex/Claude/Ollama) | Fase 1, trait `AiProvider` | Alta | Detectar + iniciar processo na pasta do projeto |
| 5 | Memória, Sessões, Continuar Projeto | Fase 4 | Alta | Tabelas `project_memories`, `ai_sessions` + botão "Continuar" |
| 6 | **Backup Center** (novo) | Fase 1 (path do projeto) | Alta | `LocalBackupProvider`, snapshot antes de IA (integra com Fase 4/5) |
| 7 | **Project Health + Quality Center** (novo) | Fase 2 (stack detectada) | Média | Detectar scripts (`npm test` etc.), rodar manualmente, `project_checks` |
| 8 | **Security Center** (novo) | Fase 7 | Média/Baixa | Começar só por `DependencyScanner`/`SecretScanner` (locais, sem alvo externo) |
| 9 | Integração IA + Findings | Fase 4 + 8 | Baixa | "Analisar com Codex/Claude" a partir de um finding |
| 10 | Timeline, automação segura, polimento | Todas anteriores | Baixa | `project_events` alimentando UI de Timeline |

**Observação sobre ordem:** o Backup Center (Fase 6) pode, na prática,
ser adiantado para logo depois da Fase 4 — o "snapshot antes de IA" só
faz sentido depois que existe uma sessão de IA para proteger. Mas a
*infraestrutura* de backup (tabelas, `BackupProvider`, botão manual
"Criar backup agora") não depende de nada além da Fase 1 e pode ser
construída em paralelo, se você preferir.

---

## 9. O que muda AGORA na arquitetura (para não refatorar depois)

Só isso, nada além:

1. Criar `src-tauri/src/events/mod.rs` com o enum `AppEvent` (vazio de
   handlers reais por enquanto, só a definição) — assim toda Fase 2+ já
   nasce emitindo eventos, em vez de precisarmos voltar depois.
2. Trocar a criação de tabela dentro de `database::init_connection` por
   arquivos de migração numerados (`schema/0001_projects.sql`), mesmo
   que hoje só exista uma. Isso evita reescrever essa função a cada
   fase nova.
3. Nenhuma mudança de UI, nenhuma dependência nova, nenhuma tabela nova
   ainda — isso é só andaime para o que vem.

Nada disso é obrigatório fazer hoje; é o que eu recomendaria como
"pequeno e seguro" caso você queira já preparar o terreno.

---

## 10. Próxima tarefa pequena e segura (sugestão)

Não implementar Backup/Health/Quality/Security ainda. Sugestão de
próximo passo, na ordem que você definiu (Fase 2 antes de tudo):

> **Detecção de stack ao cadastrar um projeto** — ler `package.json`,
> `Cargo.toml`, `requirements.txt` etc. da pasta escolhida no momento da
> criação do projeto, preencher a coluna `stack` (que já existe na
> tabela `projects` desde a Fase 1) e mostrar isso na aba "Visão Geral"
> em vez de "Não detectado ainda".

É pequeno, usa só o que já existe (sem tabela nova, sem provider novo,
sem dependência nova), e destrava visualmente a primeira promessa da
Fase 2. Quer que eu comece por aí, ou prefere que eu primeiro só faça
os dois ajustes de andaime da Seção 9 (eventos + migrações numeradas)
antes de tocar em qualquer feature nova?
