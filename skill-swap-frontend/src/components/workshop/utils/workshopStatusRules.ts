import type { Workshop } from '../../../types/workshop';
import { USER_VISIBLE_ACTIVE_STATUSES } from '../constants/workshopStatusConstants';
import type { AdminWorkshopStatus, UserWorkshopStatus } from '../models/workshopStatusModel';

const USER_VISIBLE_ACTIVE_STATUS_SET = new Set<string>(USER_VISIBLE_ACTIVE_STATUSES);

export function normalizeAdminWorkshopStatus(status?: string): AdminWorkshopStatus {
  const normalized = (status || 'pending').toLowerCase();

  if (
    normalized === 'pending' ||
    normalized === 'approved' ||
    normalized === 'rejected' ||
    normalized === 'cancelled' ||
    normalized === 'completed' ||
    normalized === 'upcoming' ||
    normalized === 'ongoing'
  ) {
    return normalized;
  }

  return 'pending';
}

function parseWorkshopStart(workshop: Workshop): Date | null {
  const rawDate = String(workshop.date || '').trim();
  const rawTime = String(workshop.time || '').trim();

  if (!rawDate) return null;

  const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  if (rawTime) {
    const timePart = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
    const dateTime = new Date(`${datePart}T${timePart}`);
    if (!Number.isNaN(dateTime.getTime())) {
      return dateTime;
    }
  }

  const fallbackDate = new Date(rawDate);
  if (!Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

function parseWorkshopEnd(workshop: Workshop, start: Date): Date | null {
  const duration = Number(workshop.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  return new Date(start.getTime() + duration * 60 * 1000);
}

export function resolveUserWorkshopStatus(
  workshop: Workshop,
  now: Date = new Date()
): UserWorkshopStatus | null {
  const adminStatus = normalizeAdminWorkshopStatus(workshop.status);

  if (adminStatus === 'completed') {
    return 'completed';
  }

  if (!USER_VISIBLE_ACTIVE_STATUS_SET.has(adminStatus)) {
    return null;
  }

  const start = parseWorkshopStart(workshop);
  if (!start) {
    return adminStatus === 'ongoing' ? 'ongoing' : 'upcoming';
  }

  const end = parseWorkshopEnd(workshop, start);
  if (end && now >= end) {
    return 'completed';
  }

  if (now >= start && (!end || now < end)) {
    return 'ongoing';
  }

  return 'upcoming';
}

export function isUserWorkshopVisible(workshop: Workshop, now?: Date): boolean {
  return resolveUserWorkshopStatus(workshop, now) !== null;
}
