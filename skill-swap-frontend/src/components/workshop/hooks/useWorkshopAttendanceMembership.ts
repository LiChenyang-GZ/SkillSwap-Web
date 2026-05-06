import { useCallback, useEffect, useRef, useState } from 'react';
import { workshopDiscoveryService } from '../../../shared/service/workshop/workshopDiscoveryService';
import { toBackendWorkshopId } from '../../../lib/api';

interface UseWorkshopAttendanceMembershipParams {
  workshopId: string;
  sessionToken: string | null;
}

export function useWorkshopAttendanceMembership({
  workshopId,
  sessionToken,
}: UseWorkshopAttendanceMembershipParams) {
  const [isAttendingByMembership, setIsAttendingByMembership] = useState(false);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshMembership = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (!sessionToken) {
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setIsAttendingByMembership(false);
      }
      return;
    }

    try {
      const attendingWorkshops = await workshopDiscoveryService.getAttending(sessionToken);
      const normalizedWorkshopId = toBackendWorkshopId(workshopId);
      const isAttending = attendingWorkshops.some(
        (workshop) => toBackendWorkshopId(String(workshop.id)) === normalizedWorkshopId
      );
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setIsAttendingByMembership(isAttending);
      }
    } catch (error) {
      console.warn('Failed to load attending membership', error);
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setIsAttendingByMembership(false);
      }
    }
  }, [sessionToken, workshopId]);

  useEffect(() => {
    void refreshMembership();
  }, [refreshMembership]);

  return {
    isAttendingByMembership,
    refreshMembership,
  };
}
