import { useCallback, useEffect, useRef, useState } from 'react';
import { toBackendWorkshopId } from '../../../lib/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

interface UseWorkshopAttendanceMembershipParams {
  workshopId: string;
  sessionToken: string | null;
}

export function useWorkshopAttendanceMembership({
  workshopId,
  sessionToken,
}: UseWorkshopAttendanceMembershipParams) {
  const [isAttendingByMembership, setIsAttendingByMembership] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const refreshMembership = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (!sessionToken) {
      setIsAttendingByMembership(false);
      return;
    }

    try {
      const attendingWorkshops = await workshopQueryService.getAttending(
        sessionToken,
        controller.signal
      );
      const normalizedWorkshopId = toBackendWorkshopId(workshopId);
      const isAttending = attendingWorkshops.some(
        (workshop) => toBackendWorkshopId(String(workshop.id)) === normalizedWorkshopId
      );
      if (!controller.signal.aborted) {
        setIsAttendingByMembership(isAttending);
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.warn('Failed to load attending membership', error);
      }
      // Keep previous membership state on transient errors.
    }
  }, [sessionToken, workshopId]);

  useEffect(() => {
    void refreshMembership();
    return () => {
      controllerRef.current?.abort();
    };
  }, [refreshMembership]);

  return {
    isAttendingByMembership,
    refreshMembership,
  };
}
