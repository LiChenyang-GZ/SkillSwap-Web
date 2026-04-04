import { Workshop } from '../../types';
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
