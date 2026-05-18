import { useCallback, useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { toBackendWorkshopId } from '../../../lib/api';
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
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const lastFetchKeyRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const hasLocalSnapshotRef = useRef(false);
  const upsertWorkshopRef = useRef(upsertWorkshop);
  const normalizedWorkshopId = toBackendWorkshopId(workshopId);
  const detailFetchKey = `${isAuthenticated ? 'auth' : 'anon'}:${normalizedWorkshopId}`;
  const refreshWorkshop = useCallback(() => {
    setRefreshNonce((previous) => previous + 1);
  }, []);

  useEffect(() => {
    upsertWorkshopRef.current = upsertWorkshop;
  }, [upsertWorkshop]);

  useEffect(() => {
    const found = workshops.find((item) => toBackendWorkshopId(String(item.id)) === normalizedWorkshopId);
    hasLocalSnapshotRef.current = Boolean(found);
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
    const loadWorkshop = async (force = false) => {
      const hasLocalSnapshot = hasLocalSnapshotRef.current;
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
        const token = isAuthenticated ? await getAuthToken() : null;
        const latest = await workshopQueryService.getById(workshopId, token, controller.signal);
        if (!controller.signal.aborted) {
          if (latest) {
            setWorkshop(latest);
            upsertWorkshopRef.current(latest);
            setErrorStatus(null);
          } else {
            setWorkshop(null);
          }
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          if (force) {
            setWorkshop(null);
            setErrorStatus(getErrorStatus(error));
          } else if (!hasLocalSnapshotRef.current) {
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
      controllerRef.current?.abort();
    };
  }, [detailFetchKey, normalizedWorkshopId, refreshNonce, isAuthenticated, getAuthToken, workshopId]);

  return {
    workshop,
    isLoading,
    errorStatus,
    refreshWorkshop,
  };
}
