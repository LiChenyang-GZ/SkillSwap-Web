import { useCallback, useEffect, useRef, useState } from 'react';
import { toBackendWorkshopId } from '../../../shared/api';
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
  const activeControllers = useRef<Set<AbortController>>(new Set()).current;
  const setMembershipOptimistic = useCallback((isAttending: boolean) => {
    setIsAttendingByMembership(isAttending);
  }, []);

  const abortActiveRequests = useCallback(() => {
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
  }, [activeControllers]);

  const refreshMembership = useCallback(async () => {
    abortActiveRequests();

    if (!enabled) {
      setIsAttendingByMembership(false);
      return true;
    }

    if (!isAuthenticated) {
      setIsAttendingByMembership(false);
      return true;
    }

    const controller = new AbortController();
    activeControllers.add(controller);

    try {
      const token = await getAuthToken();
      if (controller.signal.aborted) {
        return false;
      }

      if (!token) {
        setIsAttendingByMembership(false);
        return true;
      }

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
    } finally {
      activeControllers.delete(controller);
    }
  }, [abortActiveRequests, activeControllers, enabled, isAuthenticated, getAuthToken, workshopId]);

  useEffect(() => {
    void refreshMembership();

    return abortActiveRequests;
  }, [abortActiveRequests, refreshMembership]);

  return {
    isAttendingByMembership,
    refreshMembership,
    setMembershipOptimistic,
  };
}
