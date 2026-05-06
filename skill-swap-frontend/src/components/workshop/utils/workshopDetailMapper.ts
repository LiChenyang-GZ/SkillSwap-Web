import type { Workshop } from '../../../types/workshop';
import { resolveUserWorkshopStatus } from './workshopStatusPublicApi';
import type { WorkshopDetailGuardState } from '../models/workshopDetailViewModel';

export function parseWorkshopAttendCloseAt(workshop: Workshop): Date | null {
  const rawAttendCloseAt = String(workshop.attendCloseAt || '').trim();
  if (!rawAttendCloseAt) {
    return null;
  }

  const parsed = new Date(rawAttendCloseAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function resolveWorkshopDetailGuardState(
  workshop: Workshop,
  userId: string | null,
  isAdmin: boolean,
  isAttendingByMembership: boolean = false,
  attendCloseAt: Date | null = parseWorkshopAttendCloseAt(workshop),
  now: Date = new Date()
): WorkshopDetailGuardState {
  const normalizedUserId = userId ? String(userId) : null;
  const normalizedUserIdTrimmed = normalizedUserId?.trim() || '';
  const isUserAttendingByParticipants =
    workshop.participants?.some((participant) => String(participant.id) === normalizedUserId) || false;
  const isUserAttending = isUserAttendingByParticipants || isAttendingByMembership;
  const isFull =
    typeof workshop.maxParticipants === 'number'
      ? (workshop.currentParticipants ?? 0) >= workshop.maxParticipants
      : false;
  const normalizedStatus = (workshop.status || '').toLowerCase();
  const isCancelled = normalizedStatus === 'cancelled';
  const isPending = normalizedStatus === 'pending';
  const isRejected = normalizedStatus === 'rejected';
  const resolvedUserStatus = resolveUserWorkshopStatus(workshop, now);
  const isUpcoming = resolvedUserStatus === 'upcoming';
  const isOngoing = resolvedUserStatus === 'ongoing';
  const isCompleted = resolvedUserStatus === 'completed' || normalizedStatus === 'completed';
  const facilitatorId = String(workshop.facilitator?.id || '').trim();
  const hasValidUserId = normalizedUserIdTrimmed.length > 0;
  const isHost = hasValidUserId && facilitatorId.length > 0 && facilitatorId === normalizedUserIdTrimmed;
  const canViewRestricted = isAdmin || isHost;

  const isAttendClosedByCutoff = isUpcoming && attendCloseAt !== null && now.getTime() >= attendCloseAt.getTime();

  return {
    isPending,
    isRejected,
    isCancelled,
    isCompleted,
    isUpcoming,
    isOngoing,
    isHost,
    isUserAttending,
    isFull,
    canViewRestricted,
    isAttendClosedByCutoff,
    resolvedUserStatus,
  };
}

export function formatWorkshopDuration(duration?: number): string | null {
  if (!duration) {
    return null;
  }

  if (duration >= 60 && duration % 60 === 0) {
    return `${duration / 60} ${duration === 60 ? 'hour' : 'hours'}`;
  }

  return `${duration} mins`;
}
