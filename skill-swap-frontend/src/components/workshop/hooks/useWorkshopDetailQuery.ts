import { useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { workshopDiscoveryService } from '../../../shared/service/workshop/workshopDiscoveryService';

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

  useEffect(() => {
    const found = workshops.find((item) => item.id === workshopId);
    if (found) {
      setWorkshop(found);
      setIsLoading(false);
    }
  }, [workshopId, workshops]);

  useEffect(() => {
    let isMounted = true;

    const loadWorkshop = async (force = false) => {
      if (!force && lastFetchedIdRef.current === workshopId) {
        return;
      }

      lastFetchedIdRef.current = workshopId;
      const hasLocalSnapshot = workshops.some((item) => item.id === workshopId);
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
  }, [sessionToken, upsertWorkshop, workshopId, workshops]);

  return {
    workshop,
    isLoading,
  };
}
