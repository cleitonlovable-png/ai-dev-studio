interface WorkspaceTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  disabledTabs?: string[];
  disabledReason?: string;
}

export function WorkspaceTabs({
  tabs,
  active,
  onChange,
  disabledTabs = [],
  disabledReason = "Disponivel em uma proxima fase",
}: WorkspaceTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border-subtle px-6">
      {tabs.map((tab) => {
        const disabled = disabledTabs.includes(tab);
        const isActive = tab === active;
        return (
          <button
            key={tab}
            disabled={disabled}
            onClick={() => !disabled && onChange(tab)}
            title={disabled ? disabledReason : undefined}
            className={`relative shrink-0 px-3 py-3 text-sm transition-colors ${
              disabled
                ? "cursor-not-allowed text-muted/40"
                : isActive
                  ? "text-slate-100"
                  : "text-muted hover:text-slate-200"
            }`}
          >
            {tab}
            {isActive && !disabled && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
