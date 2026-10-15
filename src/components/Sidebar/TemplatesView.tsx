import { LayoutTemplate } from "lucide-react";

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  seedDescription: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "web-app",
    title: "Aplicação Web",
    description: "Frontend + backend, autenticação, banco de dados.",
    seedDescription:
      "Aplicação web com frontend, backend, autenticação de usuários e banco de dados.",
  },
  {
    id: "rest-api",
    title: "API REST",
    description: "Serviço backend com endpoints, autenticação e persistência.",
    seedDescription: "API REST com endpoints CRUD, autenticação por token e persistência em banco de dados.",
  },
  {
    id: "cli-tool",
    title: "Ferramenta de Linha de Comando",
    description: "CLI para automatizar uma tarefa específica.",
    seedDescription: "Ferramenta de linha de comando (CLI) para automatizar uma tarefa recorrente.",
  },
  {
    id: "mobile-app",
    title: "App Mobile",
    description: "App multiplataforma (iOS/Android) com telas e navegação.",
    seedDescription: "App mobile multiplataforma com telas de navegação, estado local e chamadas a uma API.",
  },
  {
    id: "browser-extension",
    title: "Extensão de Navegador",
    description: "Extensão para Chrome/Firefox com popup e content script.",
    seedDescription: "Extensão de navegador com popup de configuração e script injetado na página.",
  },
  {
    id: "data-pipeline",
    title: "Pipeline de Dados",
    description: "Ingestão, transformação e armazenamento de dados.",
    seedDescription: "Pipeline de dados: ingestão de uma fonte, transformação e armazenamento para análise.",
  },
];

interface TemplatesViewProps {
  onUseTemplate: (template: ProjectTemplate) => void;
}

/**
 * "Modelos de Projeto": modelos fixos que pre-preenchem o modal de "Novo
 * Projeto do Zero" (nome sugerido + descricao inicial), poupando o usuario
 * de comecar com a tela em branco. Nao e um gerador de codigo — e so um
 * ponto de partida para a fase de ideia/planejamento.
 */
export function TemplatesView({ onUseTemplate }: TemplatesViewProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border-subtle px-6 py-4">
        <LayoutTemplate size={18} className="text-accent" />
        <div>
          <h1 className="text-base font-semibold text-slate-100">Modelos de Projeto</h1>
          <p className="text-xs text-muted">
            Escolha um ponto de partida — cria um projeto do zero já com nome e descrição sugeridos.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROJECT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onUseTemplate(tpl)}
              className="rounded-card border border-border-subtle bg-base-900 p-4 text-left hover:border-accent hover:bg-base-850"
            >
              <p className="text-sm font-medium text-slate-100">{tpl.title}</p>
              <p className="mt-1 text-xs text-muted">{tpl.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
