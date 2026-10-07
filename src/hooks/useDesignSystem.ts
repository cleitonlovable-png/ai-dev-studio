import { useCallback, useEffect, useState } from "react";
import type { ColorToken, DesignSystemData, TypographyToken } from "@/types/designSystem";
import { getDesignSystem, updateDesignSystem } from "@/services/designSystem";

export function useDesignSystem(projectId: number | null) {
  const [data, setData] = useState<DesignSystemData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId === null) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await getDesignSystem(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (colors: ColorToken[], typography: TypographyToken[]) => {
      if (projectId === null) return;
      const updated = await updateDesignSystem(projectId, colors, typography);
      setData(updated);
      return updated;
    },
    [projectId]
  );

  return { data, loading, save, refresh };
}
