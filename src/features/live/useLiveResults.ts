"use client";

import { useEffect, useState } from "react";
import type {
  LiveResultsApiResponse,
  LiveResultsPayload,
} from "@/features/live/types";

interface UseLiveResultsOptions {
  intervalMs?: number;
}

/**
 * Hook de polling para las páginas públicas de resultados.
 * Mantiene la última data válida aunque una actualización falle.
 */
export function useLiveResults(
  initialData: LiveResultsPayload,
  { intervalMs = 4000 }: UseLiveResultsOptions = {}
) {
  const [data, setData] = useState<LiveResultsPayload>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      inFlight = true;
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/live/results", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = (await response.json()) as LiveResultsApiResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.success ? "Respuesta inválida" : json.error);
        }

        if (!cancelled) {
          setData(json.data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo actualizar. Reintentando...");
        }
      } finally {
        inFlight = false;
        if (!cancelled) setIsRefreshing(false);
      }
    };

    void load();
    const timer = window.setInterval(load, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, refreshTick]);

  return {
    data,
    error,
    isRefreshing,
    refresh: () => setRefreshTick((tick) => tick + 1),
  };
}
