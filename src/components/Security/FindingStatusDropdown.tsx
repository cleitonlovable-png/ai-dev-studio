import { useState } from "react";
import type { FindingStatus } from "@/types/securityReport";
import { updateFindingStatus } from "@/services/securityReports";

const STATUS_OPTIONS: Array<{ value: FindingStatus; label: string }> = [
  { value: "open", label: "Aberto" },
  { value: "reviewing", label: "Revisando" },
  { value: "false_positive", label: "Falso positivo" },
  { value: "resolved", label: "Resolvido" },
  { value: "accepted_risk", label: "Risco aceito" },
];

const STATUS_STYLE: Record<FindingStatus, string> = {
  open: "bg-danger/15 text-danger",
  reviewing: "bg-warning/15 text-warning",
  false_positive: "bg-muted/15 text-muted",
  resolved: "bg-success/15 text-success",
  accepted_risk: "bg-accent/15 text-accent",
};

interface FindingStatusDropdownProps {
  findingId: number;
  status: FindingStatus;
  onChanged?: (status: FindingStatus) => void;
}

export function FindingStatusDropdown({ findingId, status, onChanged }: FindingStatusDropdownProps) {
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: FindingStatus) {
    setSaving(true);
    try {
      await updateFindingStatus(findingId, next);
      setCurrent(next);
      onChanged?.(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as FindingStatus)}
      onClick={(e) => e.stopPropagation()}
      className={`rounded border-0 px-1.5 py-0.5 text-[10px] font-medium focus:outline-none ${STATUS_STYLE[current]}`}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-base-850 text-slate-200">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
