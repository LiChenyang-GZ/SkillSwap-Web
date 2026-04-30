import type { Workshop } from '../../types/workshop';
import { resolveUserWorkshopStatus } from './workshopStatusRules';

export type WorkshopBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function getUserWorkshopStatusLabel(workshop: Workshop, now?: Date): string | null {
  const status = resolveUserWorkshopStatus(workshop, now);

  if (status === 'ongoing') return 'OnGoing';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'completed') return 'Completed';
  return null;
}

export function getUserWorkshopStatusBadgeVariant(
  workshop: Workshop,
  now?: Date
): WorkshopBadgeVariant {
  const status = resolveUserWorkshopStatus(workshop, now);

  if (status === 'upcoming' || status === 'ongoing') return 'default';
  if (status === 'completed') return 'outline';
  return 'secondary';
}

export function isUserWorkshopUpcoming(workshop: Workshop, now?: Date): boolean {
  return resolveUserWorkshopStatus(workshop, now) === 'upcoming';
}

export function isUserWorkshopUpcomingOrOngoing(workshop: Workshop, now?: Date): boolean {
  const status = resolveUserWorkshopStatus(workshop, now);
  return status === 'upcoming' || status === 'ongoing';
}

function parseAttendCloseAt(workshop: Workshop): Date | null {
  const raw = String(workshop.attendCloseAt || '').trim();
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isWorkshopOpenForRegistration(workshop: Workshop, now: Date = new Date()): boolean {
  const status = resolveUserWorkshopStatus(workshop, now);
  if (status !== 'upcoming') {
    return false;
  }

  const maxParticipants = Number(workshop.maxParticipants ?? 0);
  const currentParticipants = Number(workshop.currentParticipants ?? 0);
  const hasCapacityLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
  if (hasCapacityLimit && currentParticipants >= maxParticipants) {
    return false;
  }

  const attendCloseAt = parseAttendCloseAt(workshop);
  if (attendCloseAt && now >= attendCloseAt) {
    return false;
  }

  return true;
}

export function getWorkshopAccessLabel(workshop: Workshop, now?: Date): 'Open Access' | 'Close Access' {
  return isWorkshopOpenForRegistration(workshop, now) ? 'Open Access' : 'Close Access';
}
