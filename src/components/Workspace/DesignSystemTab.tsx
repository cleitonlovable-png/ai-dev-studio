import { useEffect, useState } from "react";
import { Palette, Plus, Save, Trash2, Type } from "lucide-react";
import type { Project } from "@/types/project";
import type { ColorToken, TypographyToken } from "@/types/designSystem";
import { useDesignSystem } from "@/hooks/useDesignSystem";
import { Card } from "@/components/common/Card";

interface DesignSystemTabProps {
  project: Project;
}

function sameTokens(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function DesignSystemTab({ project }: DesignSystemTabProps) {
  const { data, loading, save } = useDesignSystem(project.id);
  const [colors, setColors] = useState<ColorToken[]>([]);
  const [typography, setTypography] = useState<TypographyToken[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => {
    if (data) {
      setColors(data.colors);
      setTypography(data.typography);
    }
  }, [data]);

  const dirty = data ? !sameTokens(colors, data.colors) || !sameTokens(typography, data.typography) : false;

  async function handleSave() {
    setSaving(true);
    try {
      await save(colors, typography);
      setSavedTick((t) => t + 1);
    } finally {
      setSaving(false);
    }
  }

  function updateColor(index: number, fields: Partial<ColorToken>) {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, ...fields } : c)));
  }

  function updateTypo(index: number, fields: Partial<TypographyToken>) {
    setTypography((prev) => prev.map((t, i) => (i === index ? { ...t, ...fields } : t)));
  }

  if (loading && !data) {
    return <p className="py-8 text-center text-sm text-muted">Carregando design system...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        {!dirty && savedTick > 0 && <span className="text-xs text-success">Salvo.</span>}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <Card
        title="Paleta de cores"
        action={
          <button
            onClick={() => setColors((prev) => [...prev, { name: "Nova cor", hex: "#3b82f6" }])}
            className="flex items-center gap-1 rounded-lg bg-base-700 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-base-600"
          >
            <Plus size={12} /> Cor
          </button>
        }
      >
        {colors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Palette size={20} className="text-muted" />
            <p className="text-sm text-muted">Nenhuma cor definida ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colors.map((color, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border-subtle bg-base-800 p-2"
              >
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#000000"}
                  onChange={(e) => updateColor(i, { hex: e.target.value })}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border-subtle bg-transparent"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    value={color.name}
                    onChange={(e) => updateColor(i, { name: e.target.value })}
                    className="w-full truncate bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                  />
                  <input
                    value={color.hex}
                    onChange={(e) => updateColor(i, { hex: e.target.value })}
                    className="w-full bg-transparent font-mono text-[11px] text-muted focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setColors((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-muted hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Tipografia"
        action={
          <button
            onClick={() =>
              setTypography((prev) => [
                ...prev,
                { name: "Novo estilo", fontFamily: "Inter", size: "16px", weight: "400" },
              ])
            }
            className="flex items-center gap-1 rounded-lg bg-base-700 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-base-600"
          >
            <Plus size={12} /> Estilo
          </button>
        }
      >
        {typography.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Type size={20} className="text-muted" />
            <p className="text-sm text-muted">Nenhum estilo de texto definido ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {typography.map((typo, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_80px_80px_auto] items-center gap-2 rounded-lg border border-border-subtle bg-base-800 p-2"
              >
                <input
                  value={typo.name}
                  onChange={(e) => updateTypo(i, { name: e.target.value })}
                  placeholder="Nome (ex: Título)"
                  className="truncate rounded bg-base-850 px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <input
                  value={typo.fontFamily}
                  onChange={(e) => updateTypo(i, { fontFamily: e.target.value })}
                  placeholder="Fonte"
                  style={{ fontFamily: typo.fontFamily || undefined }}
                  className="truncate rounded bg-base-850 px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <input
                  value={typo.size}
                  onChange={(e) => updateTypo(i, { size: e.target.value })}
                  placeholder="Tamanho"
                  className="truncate rounded bg-base-850 px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <input
                  value={typo.weight}
                  onChange={(e) => updateTypo(i, { weight: e.target.value })}
                  placeholder="Peso"
                  className="truncate rounded bg-base-850 px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => setTypography((prev) => prev.filter((_, idx) => idx !== i))}
                  className="justify-self-end text-muted hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
