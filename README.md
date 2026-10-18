# CSC Studio

Camada visual de gerenciamento de projetos de desenvolvimento — administra
projetos, contexto, sessões, tarefas, Git, terminal e diferentes ferramentas
de IA (Codex, Claude Code, Ollama) em um único app desktop.

**Importante:** o CSC Studio não é outra IA e não substitui Codex/Claude
Code/Ollama. Ele é a camada que fica "por cima" deles — o projeto pertence
ao CSC Studio, não à IA usada no momento.

Stack: **Tauri 2 + Rust + React + TypeScript + Vite + SQLite + Tailwind CSS**.

---

## Status atual: Fases 1 a 10 concluídas — roadmap original completo

Todas as 10 fases do plano original foram implementadas:

- [x] **Fases 1-6**: projetos, Git, terminal PTY, detecção de IA, memória/
      sessões, backup — histórico completo mais abaixo
- [x] **Fase 7**: Project Health + Quality Center
- [x] **Fase 8**: Security Center (webhook SecureScan, scanner de
      dependências, scanner de secrets local, OWASP ZAP, ciclo de vida de
      findings, "Analisar com IA" a partir de um finding)
- [x] **Fase 9**: coberta dentro da Fase 8 ("Analisar com IA")
- [x] **Fase 10**: Timeline do projeto — o barramento de eventos
      (`AppEvent`) que ficou parado desde a Fase 1 agora está ativo de
      verdade: projeto aberto, backup criado/restaurado, sessão de IA
      iniciada/finalizada, build/teste concluído e scan de segurança
      concluído viram uma linha na aba "Timeline", em ordem cronológica

**Todas as abas visíveis agora têm implementação real**, incluindo as duas
que ficaram como placeholder por mais tempo:

- [x] **Aba "Notas"**: CRUD completo de notas livres por projeto (tabela
      `notes`, comando `notes.rs`) — diferente da Memória (que é
      estruturada por categoria, pensada para dar contexto à IA), a Nota é
      um bloco de texto livre do usuário (rascunho, lembrete).
- [x] **Aba "Configurações"**: edição de nome, descrição, status e IA
      padrão do projeto (comando `update_project`). O caminho (`path`)
      nunca é editável por aqui — trocar a pasta de um projeto é uma
      operação diferente e não é suportada.

Checkmarx (Fase 8) continua só documentado — exige credenciais de uma
conta paga específica, fora do escopo deste app.

## Novo: "Criar Projeto do Zero" — fase de ideia/planejamento

A sidebar agora tem **dois botões separados**:

- **"Novo Projeto"** (do zero): só pede nome e descrição — o projeto
  nasce sem pasta local vinculada (`path = NULL` no banco; migration
  `0013_make_path_nullable`). Fica na fase de ideia/planejamento.
- **"Abrir Projeto"**: o fluxo de sempre (seletor de pasta local).

Um projeto "do zero" entra direto nas abas que não dependem de
filesystem: Visão Geral, Tarefas, Segurança, Timeline, Sessões,
Memória, **Notas**, **Fluxograma** e **Design System**, além de
Configurações. As abas que precisam de uma pasta real (Terminal, Git,
Arquivos, Qualidade, Backups) ficam desabilitadas com uma dica
explicando o motivo, até o usuário vincular uma pasta — o que pode ser
feito a qualquer momento na aba Configurações, com o comando
`link_project_folder` (detecta a stack na hora, igual ao fluxo de abrir
um projeto existente).

Dois recursos novos para essa fase de planejamento:

- [x] **Aba "Fluxograma"**: fluxogramas/mapas mentais em sintaxe
      **Mermaid** (`flowchart`, `mindmap`, `sequenceDiagram`, etc.) —
      editor de texto com preview renderizado ao vivo (lib `mermaid`),
      vários diagramas por projeto (tabela `diagrams`).
- [x] **Aba "Design System"**: paleta de cores (nome + hex, com color
      picker) e estilos de tipografia (nome + fonte + tamanho + peso),
      guardados como JSON por projeto (tabela `design_systems`,
      upsert via `update_design_system`).

Depois do checkpoint original das 10 fases, o app passou por uma **rodada
de correção de bugs** relatados pelo usuário (excluir projeto, Codex não
abrindo, VS Code não encontrado, ícone genérico) e, mais recentemente, por
uma **auditoria de consistência** (toda struct `Deserialize`/`Serialize`
cruzada contra `rename_all = "camelCase"`, todo comando `#[tauri::command]`
cruzado contra o registro em `main.rs`, e toda chamada `invoke()` do
frontend cruzada contra os comandos registrados — sem nenhuma divergência
encontrada na passada mais recente).

### O que foi validado neste ambiente vs. o que falta validar

| Parte | Status |
|---|---|
| Frontend (React/TS/Vite/Tailwind/xterm.js) | ✅ `tsc --noEmit` e `vite build` rodados com sucesso aqui a cada mudança |
| Consistência de nomes entre frontend e backend (todo `invoke()` × todo comando Rust) | ✅ Auditado sistematicamente — zero divergência |
| Backend Rust — tudo até a Fase 8 | ✅ Compilação real confirmada pelo usuário no Windows, com correções aplicadas depois |
| Backend Rust — Fase 10 (Timeline) | ⚠️ Revisado manualmente, ainda não compilado de verdade |

---

## Setup no Windows

### 1. Pré-requisitos

1. **Node.js** (LTS 20+): https://nodejs.org
2. **Rust** via `rustup` (não use o Rust do `winget`/Store, use o oficial):
   https://rustup.rs — baixe e rode o `rustup-init.exe`
3. **Microsoft C++ Build Tools** (necessário para compilar o Rust no
   Windows): instale o "Visual Studio Build Tools" com a carga de trabalho
   **"Desenvolvimento para desktop com C++"**:
   https://visualstudio.microsoft.com/visual-cpp-build-tools/
4. **WebView2** — já vem instalado por padrão no Windows 10/11 atualizados;
   se faltar, baixe em https://developer.microsoft.com/microsoft-edge/webview2/

Depois de instalar, confirme no PowerShell:
```powershell
node --version
npm --version
rustc --version
cargo --version
```

### 2. Instalar dependências do projeto

Na pasta raiz do projeto (`ai-dev-studio/`):
```powershell
npm install
```

### 3. Rodar em modo desenvolvimento

```powershell
npm run tauri dev
```

Isso vai:
1. Subir o servidor Vite (frontend) em `http://localhost:1420`
2. Compilar o backend Rust (primeira vez demora alguns minutos, baixa e
   compila todas as dependências)
3. Abrir a janela do CSC Studio

Se der erro de compilação Rust na primeira vez, me manda a mensagem
completa do terminal que eu ajusto.

### 4. Build de produção (gera o instalador `.exe`/`.msi`)

```powershell
npm run tauri build
```

---

## Onde os dados ficam

O SQLite fica em:
```
C:\Users\<seu_usuario>\AppData\Roaming\com.aidevstudio.app\aidevstudio.db
```

## Estrutura do projeto

```
ai-dev-studio/
├── src/                          # Frontend React + TypeScript
│   ├── components/
│   │   ├── Layout/               # TopBar
│   │   ├── Sidebar/               # Lista de projetos, busca, novo projeto
│   │   ├── Workspace/             # Header + abas + Visão Geral
│   │   ├── AIPanel/                # Painel de assistentes de IA (Fase 1: estático)
│   │   ├── Terminal/               # Terminal mock (Fase 1: visual apenas)
│   │   └── common/                 # Componentes reutilizaveis (Card)
│   ├── features/                   # Reservado para logica especifica por dominio
│   ├── hooks/                       # useProjects (estado de projetos)
│   ├── services/                    # Camada que chama invoke() do Tauri
│   ├── types/                        # Tipos compartilhados (Project, AiProviderInfo)
│   └── App.tsx / main.tsx
├── src-tauri/                     # Backend Rust
│   ├── migrations/                  # Migracoes SQL numeradas (0001_...sql)
│   ├── src/
│   │   ├── commands/               # Comandos expostos ao frontend (#[tauri::command])
│   │   ├── database/                # Conexao SQLite + runner de migracoes + struct Project
│   │   ├── events/                    # AppEvent (esqueleto, ainda nao emitido - Fase 2+)
│   │   ├── providers/                # Reservado (Fase 4: Codex/Claude/Ollama)
│   │   ├── security/                  # Reservado (classificacao SAFE/CONFIRM/BLOCKED)
│   │   ├── filesystem/                 # Reservado (Fase 2: deteccao de stack)
│   │   └── main.rs
│   ├── capabilities/default.json    # Permissoes do Tauri v2 (dialog, core)
│   ├── tauri.conf.json
│   └── Cargo.toml
├── package.json
└── vite.config.ts / tailwind.config.js / tsconfig.json
```

## Próximos passos recomendados (conforme o roteiro original)

- **Fase 2**: detecção automática de stack (package.json, Cargo.toml,
  requirements.txt etc.), Git status, arquivos recentes
- **Fase 3**: terminal integrado de verdade via PTY (PowerShell/CMD/Git Bash)
- **Fase 4**: `AiProvider` desacoplado com `CodexProvider`, `ClaudeProvider`,
  `OllamaProvider` (detect/start/stop/sendCommand/getStatus)
- **Fase 5**: sessões de IA, memória do projeto, "Continuar Projeto"
- **Fase 6**: backups, histórico, refinamentos

Antes de qualquer mudança nas próximas fases: analisar a estrutura atual,
explicar brevemente o que será feito, fazer mudanças pequenas, validar a
compilação, e informar quais arquivos foram alterados — como combinado.
