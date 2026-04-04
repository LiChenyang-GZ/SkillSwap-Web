import type { WorkshopUpsertPayload } from '../../lib/api';
import { normalizeAustralianContactNumber, type CreateWorkshopFormValues } from './schema';

export function toWorkshopUpsertPayload(values: CreateWorkshopFormValues): WorkshopUpsertPayload {
  const maxParticipants = values.maxParticipants.trim();

  return {
    hostName: values.hostName.trim(),
    title: values.title.trim(),
    description: values.otherImportantInfo.trim() || values.title.trim(),
    category: values.category.trim(),
    duration: Number(values.duration),
    maxParticipants: maxParticipants ? Number(maxParticipants) : null,
    date: values.date,
    time: values.time,
    isOnline: values.isOnline,
    location: values.isOnline ? 'Online' : '',
    contactNumber: normalizeAustralianContactNumber(values.contactNumber),
    materialsProvided: values.materialsProvided.trim(),
    materialsNeededFromClub: values.materialsNeededFromClub.trim(),
    venueRequirements: values.venueRequirements.trim(),
    otherImportantInfo: values.otherImportantInfo.trim(),
    detailsConfirmed: values.detailsConfirmed,
  };
}
