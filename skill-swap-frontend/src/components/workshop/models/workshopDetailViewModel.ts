import type { UserWorkshopStatus } from './workshopStatusModel';

export interface WorkshopDetailGuardState {
  isPending: boolean;
  isRejected: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  isUpcoming: boolean;
  isOngoing: boolean;
  isHost: boolean;
  isUserAttending: boolean;
  isFull: boolean;
  canViewRestricted: boolean;
  isAttendClosedByCutoff: boolean;
  resolvedUserStatus: UserWorkshopStatus | null;
}
