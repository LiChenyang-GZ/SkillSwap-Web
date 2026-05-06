import { useCallback, useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { toBackendWorkshopId } from '../../../lib/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

const getErrorStatus = (error: unknown): number | null => {
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number') {
    return status;
  }

  const message = (error as { message?: string })?.message;
  const matched = typeof message === 'string' ? message.match(/\b(401|403)\b/) : null;
  return matched ? Number(matched[1]) : null;
};

interface UseWorkshopDetailQueryParams {
  workshopId: string;
  workshops: Workshop[];
  sessionToken: string | null;
  upsertWorkshop: (workshop: Workshop) => void;
}

export function useWorkshopDetailQuery({
  workshopId,
  workshops,
  sessionToken,
  upsertWorkshop,
}: UseWorkshopDetailQueryParams) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const lastFetchKeyRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const normalizedWorkshopId = toBackendWorkshopId(workshopId);
  const detailFetchKey = `${sessionToken ?? 'anon'}:${normalizedWorkshopId}`;
  const refreshWorkshop = useCallback(() => {
    setRefreshNonce((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const found = workshops.find((item) => toBackendWorkshopId(String(item.id)) === normalizedWorkshopId);
    if (found) {
      setWorkshop(found);
      setIsLoading(false);
      setErrorStatus(null);
      return;
    }

    // Prevent showing stale details from previous workshop while next detail request is loading.
    setWorkshop((previous) =>
      previous && toBackendWorkshopId(String(previous.id)) === normalizedWorkshopId ? previous : null
    );
    setIsLoading(true);
  }, [normalizedWorkshopId, workshops]);

  useEffect(() => {
    const hasLocalSnapshot =
      workshop !== null && toBackendWorkshopId(String(workshop.id)) === normalizedWorkshopId;

    const loadWorkshop = async (force = false) => {
      const hasActiveSameKeyRequest =
        lastFetchKeyRef.current === detailFetchKey &&
        controllerRef.current !== null &&
        !controllerRef.current.signal.aborted;

      if (!force && hasActiveSameKeyRequest) {
        return;
      }

      lastFetchKeyRef.current = detailFetchKey;
      setErrorStatus(null);
      if (!hasLocalSnapshot) {
        setIsLoading(true);
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const latest = await workshopQueryService.getById(workshopId, sessionToken, controller.signal);
        if (!controller.signal.aborted && latest) {
          setWorkshop(latest);
          upsertWorkshop(latest);
          setErrorStatus(null);
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          setErrorStatus(getErrorStatus(error));
          console.warn('Failed to refresh workshop details', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkshop(refreshNonce > 0);

    return () => {
      controllerRef.current?.abort();
    };
  }, [detailFetchKey, normalizedWorkshopId, refreshNonce, sessionToken, upsertWorkshop, workshopId]);

  return {
    workshop,
    isLoading,
    errorStatus,
    refreshWorkshop,
  };
}
