import { Workshop } from '../../../types';
import { WorkshopFormState } from '../models/adminReviewModels';

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
  const status = String(workshop.status || '').trim().toLowerCase();

  if (['pending', 'rejected', 'cancelled', 'completed'].includes(status)) {
    return status as Workshop['status'];
  }

  const dateValue = String(workshop.date || '').trim();
  const timeValue = String(workshop.time || '').trim();
  const datePart = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const timePart = timeValue ? (timeValue.length === 5 ? `${timeValue}:00` : timeValue) : '00:00:00';

  if (!datePart) {
    return 'approved';
  }

  const start = new Date(`${datePart}T${timePart}`);
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
