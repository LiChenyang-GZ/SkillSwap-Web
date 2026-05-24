import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { toBackendWorkshopId } from '../../../shared/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

const getErrorStatus = (error: unknown): number | null => {
  const status = (error as { status?: number })?.status;
  return typeof status === 'number' ? status : null;
};

interface UseWorkshopDetailQueryParams {
  workshopId: string;
  workshops: Workshop[];
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  upsertWorkshop: (workshop: Workshop) => void;
}

export function useWorkshopDetailQuery({
  workshopId,
  workshops,
  isAuthenticated,
  getAuthToken,
  upsertWorkshop,
}: UseWorkshopDetailQueryParams) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [fetchedWorkshop, setFetchedWorkshop] = useState<Workshop | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const lastFetchKeyRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const upsertWorkshopRef = useRef(upsertWorkshop);
  const normalizedWorkshopId = toBackendWorkshopId(workshopId);
  const detailFetchKey = `${isAuthenticated ? 'auth' : 'anon'}:${normalizedWorkshopId}`;
  const localWorkshop = useMemo(
    () => workshops.find((item) => toBackendWorkshopId(String(item.id)) === normalizedWorkshopId) || null,
    [normalizedWorkshopId, workshops]
  );
  const hasLocalSnapshot = Boolean(localWorkshop);
  const workshop =
    localWorkshop ||
    (fetchedWorkshop && toBackendWorkshopId(String(fetchedWorkshop.id)) === normalizedWorkshopId ? fetchedWorkshop : null);
  const refreshWorkshop = useCallback(() => {
    setRefreshNonce((previous) => previous + 1);
  }, []);

  useEffect(() => {
    upsertWorkshopRef.current = upsertWorkshop;
  }, [upsertWorkshop]);

  useEffect(() => {
    let effectController: AbortController | null = null;

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
      effectController = controller;

      try {
        const token = isAuthenticated ? await getAuthToken() : null;
        const latest = await workshopQueryService.getById(workshopId, token, controller.signal);
        if (!controller.signal.aborted) {
          if (latest) {
            setFetchedWorkshop(latest);
            upsertWorkshopRef.current(latest);
            setErrorStatus(null);
          } else {
            setFetchedWorkshop(null);
          }
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          if (force) {
            setFetchedWorkshop(null);
            setErrorStatus(getErrorStatus(error));
          } else if (!hasLocalSnapshot) {
            setErrorStatus(getErrorStatus(error));
          }
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
      effectController?.abort();
    };
  }, [detailFetchKey, refreshNonce, isAuthenticated, getAuthToken, workshopId, hasLocalSnapshot]);

  return {
    workshop,
    isLoading: !workshop && isLoading,
    errorStatus,
    refreshWorkshop,
  };
}
