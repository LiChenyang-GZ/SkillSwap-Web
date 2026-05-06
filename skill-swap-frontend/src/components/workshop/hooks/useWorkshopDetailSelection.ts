import { useMemo } from 'react';
import type { Workshop } from '../../../types/workshop';
import { parseWorkshopAttendCloseAt, resolveWorkshopDetailGuardState } from '../utils/workshopDetailMapper';

interface UseWorkshopDetailSelectionParams {
  workshop: Workshop | null;
  userId: string | null;
  isAdmin: boolean;
  isAttendingByMembership?: boolean;
}

export function useWorkshopDetailSelection({
  workshop,
  userId,
  isAdmin,
  isAttendingByMembership = false,
}: UseWorkshopDetailSelectionParams) {
  return useMemo(() => {
    if (!workshop) {
      return {
        guardState: null,
        attendCloseAt: null,
      };
    }

    const attendCloseAt = parseWorkshopAttendCloseAt(workshop);

    return {
      guardState: resolveWorkshopDetailGuardState(
        workshop,
        userId,
        isAdmin,
        isAttendingByMembership,
        attendCloseAt
      ),
      attendCloseAt,
    };
  }, [isAdmin, isAttendingByMembership, userId, workshop]);
}
