import { useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { toBackendWorkshopId } from '../../../lib/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

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
  const lastFetchKeyRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const normalizedWorkshopId = toBackendWorkshopId(workshopId);
  const detailFetchKey = `${sessionToken ?? 'anon'}:${normalizedWorkshopId}`;

  useEffect(() => {
    const found = workshops.find((item) => toBackendWorkshopId(String(item.id)) === normalizedWorkshopId);
    if (found) {
      setWorkshop(found);
      setIsLoading(false);
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
      if (!force && lastFetchKeyRef.current === detailFetchKey) {
        return;
      }

      lastFetchKeyRef.current = detailFetchKey;
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
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          console.warn('Failed to refresh workshop details', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkshop();

    return () => {
      controllerRef.current?.abort();
      // React StrictMode mounts/unmounts effects twice in dev.
      // Reset the key so the remount pass can still attach to the in-flight request.
      if (lastFetchKeyRef.current === detailFetchKey) {
        lastFetchKeyRef.current = null;
      }
    };
  }, [detailFetchKey, normalizedWorkshopId, sessionToken, upsertWorkshop, workshopId]);

  return {
    workshop,
    isLoading,
  };
}
