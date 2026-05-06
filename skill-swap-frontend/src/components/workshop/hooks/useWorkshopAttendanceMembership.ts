import { useCallback, useEffect, useState } from 'react';
import { workshopDiscoveryService } from '../../../shared/service/workshop/workshopDiscoveryService';

interface UseWorkshopAttendanceMembershipParams {
  workshopId: string;
  sessionToken: string | null;
}

export function useWorkshopAttendanceMembership({
  workshopId,
  sessionToken,
}: UseWorkshopAttendanceMembershipParams) {
  const [isAttendingByMembership, setIsAttendingByMembership] = useState(false);

  const refreshMembership = useCallback(async () => {
    if (!sessionToken) {
      setIsAttendingByMembership(false);
      return;
    }

    try {
      const attendingWorkshops = await workshopDiscoveryService.getAttending(sessionToken);
      const isAttending = attendingWorkshops.some(
        (workshop) => String(workshop.id) === String(workshopId)
      );
      setIsAttendingByMembership(isAttending);
    } catch (error) {
      console.warn('Failed to load attending membership', error);
      setIsAttendingByMembership(false);
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
