import type { Workshop } from '../../../types/workshop';
import { normalizeAdminWorkshopStatus } from '../../workshop/workshopStatusRules';
import { WorkshopFormState } from '../models/adminReviewFormModel';
import { ADMIN_REVIEW_RESOLVED_WORKSHOP_STATUSES } from '../constants/adminReviewStatusConstants';

export const normalizeContactNumber = (value: string) => value.replace(/\D/g, '');

export const normalizeAttendCloseAtForApi = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length === 16) {
    return `${trimmed}:00`;
  }

  return trimmed;
};

export const resolveAdminDisplayStatus = (workshop: Workshop): Workshop['status'] => {
  const status = normalizeAdminWorkshopStatus(workshop.status);

  if (ADMIN_REVIEW_RESOLVED_WORKSHOP_STATUSES.includes(status as (typeof ADMIN_REVIEW_RESOLVED_WORKSHOP_STATUSES)[number])) {
    return status as Workshop['status'];
  }

  const start = parseWorkshopStart(workshop);
  if (Number.isNaN(start.getTime())) {
    return 'approved';
  }

  const durationMinutes = Number(workshop.duration);
  if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return Date.now() >= end.getTime() ? 'completed' : 'approved';
  }

  const now = new Date();
  const isSameCalendarDay =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth() &&
    now.getDate() === start.getDate();

  if (now > start && !isSameCalendarDay) {
    return 'completed';
  }

  return 'approved';
};

export const parseWorkshopStart = (workshop: Pick<Workshop, 'date' | 'time'>): Date => {
  const dateValue = String(workshop.date || '').trim();
  const timeValue = String(workshop.time || '').trim();
  const datePart = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const timePart = timeValue ? (timeValue.length === 5 ? `${timeValue}:00` : timeValue) : '00:00:00';
  if (!datePart) {
    return new Date(Number.NaN);
  }
  return new Date(`${datePart}T${timePart}`);
};

export const hasWorkshopStarted = (workshop: Pick<Workshop, 'date' | 'time'>, now: number = Date.now()): boolean => {
  const start = parseWorkshopStart(workshop);
  if (Number.isNaN(start.getTime())) {
    return false;
  }
  return start.getTime() <= now;
};

export const normalizeFormState = (state: WorkshopFormState): WorkshopFormState => ({
  ...state,
  title: state.title.trim(),
  description: state.description.trim(),
  category: state.category.trim(),
  hostName: state.hostName.trim(),
  contactNumber: state.contactNumber.trim(),
  duration: state.duration.trim(),
  maxParticipants: state.maxParticipants.trim(),
  date: state.date.trim(),
  time: state.time.trim(),
  attendCloseAt: state.attendCloseAt.trim(),
  location: state.location.trim(),
  image: state.image.trim(),
  materialsProvided: state.materialsProvided.trim(),
  materialsNeededFromClub: state.materialsNeededFromClub.trim(),
  venueRequirements: state.venueRequirements.trim(),
  otherImportantInfo: state.otherImportantInfo.trim(),
  weekNumber: state.weekNumber.trim(),
  memberResponsible: state.memberResponsible.trim(),
  membersPresent: state.membersPresent.trim(),
  eventSubmitted: state.eventSubmitted,
  usuApprovalStatus: state.usuApprovalStatus,
  detailsConfirmed: state.detailsConfirmed,
});

export const buildWorkshopFormState = (workshop: Workshop): WorkshopFormState => {
  const locationValue = Array.isArray(workshop.location)
    ? workshop.location[0] || ''
    : workshop.location || '';

  const attendCloseAtValue = (() => {
    const raw = String(workshop.attendCloseAt || '').trim();
    if (!raw) {
      return '';
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw.length >= 16 ? raw.slice(0, 16) : '';
    }

    const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
    return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
  })();

  return {
    image: workshop.image || '',
    hostName: workshop.hostName || '',
    title: workshop.title || '',
    description: workshop.description || '',
    category: workshop.category || '',
    contactNumber: workshop.contactNumber || '',
    duration: workshop.duration ? String(workshop.duration) : '',
    maxParticipants: workshop.maxParticipants ? String(workshop.maxParticipants) : '',
    date: workshop.date || '',
    time: workshop.time || '',
    attendCloseAt: attendCloseAtValue,
    location: workshop.isOnline ? '' : locationValue,
    isOnline: !!workshop.isOnline,
    materialsProvided: workshop.materialsProvided || '',
    materialsNeededFromClub: workshop.materialsNeededFromClub || '',
    venueRequirements: workshop.venueRequirements || '',
    otherImportantInfo: workshop.otherImportantInfo || '',
    weekNumber: workshop.weekNumber ? String(workshop.weekNumber) : '',
    memberResponsible: workshop.memberResponsible || '',
    membersPresent: workshop.membersPresent || '',
    eventSubmitted: workshop.eventSubmitted ? 'true' : 'false',
    usuApprovalStatus: workshop.usuApprovalStatus === 'approved' ? 'approved' : 'pending',
    detailsConfirmed: !!workshop.detailsConfirmed,
  };
};
