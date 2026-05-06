import { useCallback, useEffect, useRef, useState } from 'react';
import { toBackendWorkshopId } from '../../../lib/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

interface UseWorkshopAttendanceMembershipParams {
  workshopId: string;
  sessionToken: string | null;
  enabled?: boolean;
}

interface RefreshMembershipOptions {
  resetOnFailure?: boolean;
}

export function useWorkshopAttendanceMembership({
  workshopId,
  sessionToken,
  enabled = true,
}: UseWorkshopAttendanceMembershipParams) {
  const [isAttendingByMembership, setIsAttendingByMembership] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const refreshMembership = useCallback(async ({ resetOnFailure = false }: RefreshMembershipOptions = {}) => {
    if (!enabled) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsAttendingByMembership(false);
      return true;
    }

    if (!sessionToken) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsAttendingByMembership(false);
      return true;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

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
      return true;
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        if (resetOnFailure) {
          setIsAttendingByMembership(false);
        }
        console.warn('Failed to load attending membership', error);
        return false;
      }
      return false;
    }
  }, [enabled, sessionToken, workshopId]);

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
