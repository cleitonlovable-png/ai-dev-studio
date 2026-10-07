import { useCallback, useEffect, useState } from "react";
import type { AiProviderStatus } from "@/types/ai";
import { detectAiProviders } from "@/services/ai";

export function useAiProviders() {
  const [providers, setProviders] = useState<AiProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProviders(await detectAiProviders());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { providers, loading, refresh };
}
