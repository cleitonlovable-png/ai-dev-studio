import type { SecurityFinding, SecurityReport } from "@/types/securityReport";
import type { Project } from "@/types/project";

/**
 * Resumo "em português de gente": gerado localmente (sem IA, sem rede) a
 * partir dos campos que o relatório já tem. Reconhece por palavra-chave os
 * problemas mais comuns de sites e traduz para uma explicação simples; o que
 * não reconhecer cai no texto original do próprio finding.
 */

interface Rule {
  match: RegExp;
  what: string;
  why: string;
}

const RULES: Rule[] = [
  {
    match: /content[- ]security[- ]policy|\bcsp\b/i,
    what: "O site não diz ao navegador de quais lugares ele pode carregar scripts e imagens.",
    why: "Se alguém conseguir injetar um código malicioso numa página, o navegador não tem uma regra para barrá-lo.",
  },
  {
    match: /strict[- ]transport|hsts/i,
    what: "O site não obriga o navegador a usar sempre a conexão segura (HTTPS).",
    why: "Numa rede Wi-Fi pública, um invasor pode forçar a versão sem cadeado e espiar o que a pessoa envia.",
  },
  {
    match: /x-frame-options|clickjacking|frame-ancestors/i,
    what: "Outro site pode colocar o seu dentro de uma moldura invisível.",
    why: "Isso permite enganar o visitante para clicar em algo do seu site sem perceber (clickjacking).",
  },
  {
    match: /x-content-type|mime[- ]sniff/i,
    what: "O navegador pode 'adivinhar' o tipo de um arquivo em vez de seguir o que o servidor informa.",
    why: "Um arquivo disfarçado pode ser executado como se fosse um script.",
  },
  {
    match: /cookie.*(secure|httponly|samesite)|(secure|httponly|samesite).*cookie/i,
    what: "Os cookies (que guardam o login da pessoa) estão sem alguma proteção importante.",
    why: "Sem elas, o cookie pode ser roubado por um script malicioso ou enviado por uma conexão sem criptografia.",
  },
  {
    match: /cors|cross-origin/i,
    what: "O site aceita pedidos de outros endereços com regras frouxas demais.",
    why: "Outro site pode ler dados que deveriam ser só do seu.",
  },
  {
    match: /ssl|tls|certificate|certificado/i,
    what: "Há um problema com o certificado ou com a criptografia da conexão (o cadeado do site).",
    why: "Visitantes podem ver avisos assustadores ou a conversa pode ser interceptada.",
  },
  {
    match: /secret|api[_ -]?key|token|password|senha|credential/i,
    what: "Uma chave ou senha pode estar exposta onde não deveria.",
    why: "Quem encontrar essa chave pode usar seus serviços como se fosse você. É o tipo de problema que merece correção rápida.",
  },
  {
    match: /sql\s*injection|injec/i,
    what: "Um campo do site pode aceitar comandos escondidos no que a pessoa digita.",
    why: "Um invasor pode ler, alterar ou apagar dados do seu banco.",
  },
  {
    match: /xss|cross[- ]site scripting/i,
    what: "O site pode exibir texto de terceiros como se fosse código.",
    why: "Um invasor pode executar scripts no navegador dos seus visitantes.",
  },
  {
    match: /version|server header|x-powered-by|banner|disclos|information leak|vaza/i,
    what: "O servidor revela detalhes sobre a tecnologia que usa (nome e versão).",
    why: "Isso facilita para um invasor procurar falhas conhecidas daquela versão. Não é uma invasão, é uma pista.",
  },
  {
    match: /\.env|\.git|backup|exposed|exposto|directory listing|listagem/i,
    what: "Um arquivo ou pasta interna pode estar acessível pela internet.",
    why: "Pode revelar código, senhas ou dados que deveriam ficar privados.",
  },
  {
    match: /dependenc|vulnerab.*(package|librar)|outdated|desatualiz|cve-/i,
    what: "O projeto usa uma biblioteca com falha de segurança já conhecida.",
    why: "Invasores usam listas públicas dessas falhas para atacar sites que não atualizaram.",
  },
  {
    match: /dns|spf|dkim|dmarc|email/i,
    what: "A configuração do domínio ou do e-mail está incompleta.",
    why: "Alguém pode se passar por você em e-mails ou o domínio pode ser mal usado.",
  },
  {
    match: /port|porta|open service|firewall/i,
    what: "Há um serviço do servidor acessível de fora que talvez não precisasse estar.",
    why: "Quanto mais portas abertas, mais portas um invasor pode tentar.",
  },
];

const SEVERITY_PLAIN: Record<string, { label: string; meaning: string }> = {
  critical: { label: "Crítico", meaning: "Corrigir o quanto antes. Pode permitir um ataque de verdade." },
  high: { label: "Alto", meaning: "Importante. Vale corrigir logo, antes de divulgar ou crescer o site." },
  medium: { label: "Médio", meaning: "Merece atenção, mas não é uma emergência." },
  low: { label: "Baixo", meaning: "Melhoria de boas práticas. Risco pequeno." },
  info: { label: "Informativo", meaning: "Só um aviso ou observação. Não é um problema por si só." },
};

export interface PlainFinding {
  id: number;
  severity: string;
  severityLabel: string;
  title: string;
  what: string;
  why: string;
  todo: string | null;
  where: string | null;
}

export interface PlainSummary {
  level: "ok" | "info" | "attention" | "urgent";
  headline: string;
  overview: string;
  findings: PlainFinding[];
}

function explain(f: SecurityFinding): { what: string; why: string } {
  const haystack = `${f.title} ${f.category ?? ""} ${f.description ?? ""}`;
  const rule = RULES.find((r) => r.match.test(haystack));
  if (rule) return { what: rule.what, why: rule.why };
  return {
    what: f.description?.trim() || "O scanner marcou este ponto, mas não enviou detalhes.",
    why: SEVERITY_PLAIN[f.severity]?.meaning ?? "Vale uma olhada com calma.",
  };
}

const ORDER = ["critical", "high", "medium", "low", "info"];

export function buildPlainSummary(report: SecurityReport): PlainSummary {
  const c = report.severityCritical;
  const h = report.severityHigh;
  const m = report.severityMedium;
  const l = report.severityLow;
  const i = report.severityInfo;
  const real = c + h + m + l;

  let level: PlainSummary["level"] = "ok";
  let headline = "Nada preocupante encontrado.";
  if (c > 0) {
    level = "urgent";
    headline = "Tem problema sério que precisa de correção agora.";
  } else if (h > 0) {
    level = "attention";
    headline = "Há um problema importante para corrigir em breve.";
  } else if (m > 0 || l > 0) {
    level = "attention";
    headline = "Nenhuma emergência, mas há pontos para melhorar.";
  } else if (i > 0) {
    level = "info";
    headline = "Só avisos informativos, nada que precise de correção.";
  }

  const parts: string[] = [];
  const where = report.domain ? `o site ${report.domain}` : "o projeto";
  parts.push(`A varredura olhou ${where} e encontrou ${report.findings.length} ponto(s) no total.`);
  if (real === 0 && i > 0) parts.push(`Os ${i} item(ns) são só informativos.`);
  if (c > 0) parts.push(`${c} crítico(s): ${SEVERITY_PLAIN.critical.meaning}`);
  if (h > 0) parts.push(`${h} alto(s): ${SEVERITY_PLAIN.high.meaning}`);
  if (m > 0) parts.push(`${m} médio(s): ${SEVERITY_PLAIN.medium.meaning}`);
  if (l > 0) parts.push(`${l} baixo(s): ${SEVERITY_PLAIN.low.meaning}`);
  if (real > 0 && i > 0) parts.push(`Mais ${i} informativo(s), sem risco por si só.`);

  const findings = [...report.findings]
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity))
    .map<PlainFinding>((f) => {
      const { what, why } = explain(f);
      return {
        id: f.id,
        severity: f.severity,
        severityLabel: SEVERITY_PLAIN[f.severity]?.label ?? f.severity,
        title: f.title,
        what,
        why,
        todo: f.remediation?.trim() || null,
        where: f.endpointOrFile,
      };
    });

  return { level, headline, overview: parts.join(" "), findings };
}

/** Acha o projeto local que corresponde ao relatório (mesmo projeto nos dois apps). */
export function matchProject(report: SecurityReport, projects: Project[]): Project | null {
  const active = projects.filter((p) => p.status !== "archived");
  if (report.projectId != null) {
    const byId = active.find((p) => p.id === report.projectId);
    if (byId) return byId;
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(report.projectName);
  if (!target) return null;
  const exact = active.find((p) => norm(p.name) === target);
  if (exact) return exact;
  const loose = active.filter((p) => {
    const n = norm(p.name);
    return n && (n.includes(target) || target.includes(n));
  });
  return loose.length === 1 ? loose[0] : null;
}

const SEVERITY_LABEL_PT: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
  info: "Info",
};

/** Texto enviado para a IA. Só usa o que o relatório já tem; nunca lê arquivos do projeto. */
export function buildFixPrompt(report: SecurityReport): string {
  const open = report.findings.filter((f) => f.status !== "resolved" && f.status !== "false_positive");
  const lines = [
    `Um scanner de segurança (SecureScan) analisou ${report.domain ?? "este projeto"} e reportou os problemas abaixo.`,
    "Este é o projeto onde esse código mora. Quero que você corrija o que for corrigível aqui.",
    "",
    `Resumo: ${report.severityCritical} crítico, ${report.severityHigh} alto, ${report.severityMedium} médio, ${report.severityLow} baixo, ${report.severityInfo} info.`,
    "",
    "Problemas:",
  ];
  open.forEach((f, idx) => {
    lines.push(`${idx + 1}. [${SEVERITY_LABEL_PT[f.severity] ?? f.severity}] ${f.title}`);
    if (f.endpointOrFile) lines.push(`   Local: ${f.endpointOrFile}`);
    if (f.description) lines.push(`   Descrição: ${f.description}`);
    if (f.remediation) lines.push(`   Recomendação do scanner: ${f.remediation}`);
  });
  lines.push(
    "",
    "Como trabalhar: comece pelos de maior severidade. Para cada item, ache onde isso é configurado no código, aplique a correção e me diga o que mudou em linguagem simples.",
    "Se algo não for corrigível no código (por exemplo, é configuração do servidor ou do provedor), diga isso claramente e explique o passo manual.",
    "Não apague dados nem mexa em arquivos .env ou segredos sem me perguntar antes."
  );
  return lines.join("\n");
}
