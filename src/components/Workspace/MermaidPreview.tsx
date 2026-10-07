import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
  initialized = true;
}

interface MermaidPreviewProps {
  source: string;
}

/**
 * Renderiza uma fonte Mermaid como SVG. Erros de sintaxe nao quebram a
 * tela — mostramos uma mensagem amigavel em vez do erro cru da lib,
 * já que o usuário pode estar no meio de uma edição.
 */
export function MermaidPreview({ source }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderId] = useState(() => `diagram-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    ensureInitialized();
    let cancelled = false;

    if (!source.trim()) {
      setError(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }

    mermaid
      .render(renderId, source)
      .then(({ svg }) => {
        if (cancelled) return;
        setError(null);
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        if (containerRef.current) containerRef.current.innerHTML = "";
      });

    return () => {
      cancelled = true;
    };
  }, [source, renderId]);

  return (
    <div className="flex h-full flex-col overflow-auto rounded-lg border border-border-subtle bg-base-950 p-4">
      {error ? (
        <div className="m-auto max-w-sm text-center">
          <p className="text-sm text-danger">Não foi possível renderizar o diagrama.</p>
          <p className="mt-1 text-xs text-muted/70">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="m-auto [&_svg]:mx-auto" />
      )}
    </div>
  );
}
