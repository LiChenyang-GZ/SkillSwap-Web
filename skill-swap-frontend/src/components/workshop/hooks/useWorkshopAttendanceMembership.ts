import { useCallback, useEffect, useRef, useState } from 'react';
import { toBackendWorkshopId } from '../../../lib/api';
import { workshopQueryService } from '../../../shared/service/workshop/workshopQueryService';

interface UseWorkshopAttendanceMembershipParams {
  workshopId: string;
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  enabled?: boolean;
}

export function useWorkshopAttendanceMembership({
  workshopId,
  isAuthenticated,
  getAuthToken,
  enabled = true,
}: UseWorkshopAttendanceMembershipParams) {
  const [isAttendingByMembership, setIsAttendingByMembership] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const setMembershipOptimistic = useCallback((isAttending: boolean) => {
    setIsAttendingByMembership(isAttending);
  }, []);

  const refreshMembership = useCallback(async () => {
    if (!enabled) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsAttendingByMembership(false);
      return true;
    }

    if (!isAuthenticated) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsAttendingByMembership(false);
      return true;
    }

    const token = await getAuthToken();
    if (!token) {
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
        token,
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
        console.warn('Failed to load attending membership', error);
        return false;
      }
      return false;
    }
  }, [enabled, isAuthenticated, getAuthToken, workshopId]);

  useEffect(() => {
    void refreshMembership();
    return () => {
      controllerRef.current?.abort();
    };
  }, [refreshMembership]);

  return {
    isAttendingByMembership,
    refreshMembership,
    setMembershipOptimistic,
  };
}
