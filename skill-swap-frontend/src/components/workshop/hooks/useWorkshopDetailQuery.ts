import { useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { workshopDiscoveryService } from '../../../shared/service/workshop/workshopDiscoveryService';
import { toBackendWorkshopId } from '../../../lib/api';

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
  const lastFetchedIdRef = useRef<string | null>(null);
  const normalizedWorkshopId = toBackendWorkshopId(workshopId);

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
    let isMounted = true;
    const hasLocalSnapshot =
      workshop !== null && toBackendWorkshopId(String(workshop.id)) === normalizedWorkshopId;

    const loadWorkshop = async (force = false) => {
      if (!force && lastFetchedIdRef.current === normalizedWorkshopId) {
        return;
      }

      lastFetchedIdRef.current = normalizedWorkshopId;
      if (!hasLocalSnapshot) {
        setIsLoading(true);
      }

      try {
        const latest = await workshopDiscoveryService.getById(workshopId, sessionToken);
        if (latest && isMounted) {
          setWorkshop(latest);
          upsertWorkshop(latest);
        }
      } catch (error) {
        console.warn('Failed to refresh workshop details', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkshop();

    return () => {
      isMounted = false;
    };
  }, [normalizedWorkshopId, sessionToken, upsertWorkshop, workshop?.id, workshopId]);

  return {
    workshop,
    isLoading,
  };
}
