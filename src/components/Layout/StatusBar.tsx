import { CheckCircle2 } from "lucide-react";

const QUOTES = [
  "Grandes projetos começam com boas ideias e organização.",
  "Desenvolva hoje o que será incrível amanhã.",
  "Um projeto bem organizado é meio caminho andado.",
];

// Frase fixa por sessao (nao muda a cada re-render) — pequeno detalhe de
// polimento, sem exigir estado ou dependencia nova.
const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

export function StatusBar() {
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border-subtle bg-base-900 px-4 text-[11px] text-muted">
      <div className="flex items-center gap-3">
        <span>v0.1.0</span>
        <span className="flex items-center gap-1 text-success">
          <CheckCircle2 size={11} /> Tudo funcionando
        </span>
      </div>
      <span className="italic text-muted/70">"{quote}"</span>
    </footer>
  );
}
