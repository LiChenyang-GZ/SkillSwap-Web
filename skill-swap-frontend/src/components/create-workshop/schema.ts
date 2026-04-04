export interface CreateWorkshopFormValues {
  hostName: string;
  title: string;
  category: string;
  contactNumber: string;
  date: string;
  time: string;
  duration: string;
  maxParticipants: string;
  isOnline: boolean;
  materialsProvided: string;
  materialsNeededFromClub: string;
  venueRequirements: string;
  otherImportantInfo: string;
  detailsConfirmed: boolean;
}

export const defaultCreateWorkshopFormValues: CreateWorkshopFormValues = {
  hostName: '',
  title: '',
  category: '',
  contactNumber: '',
  date: '',
  time: '',
  duration: '',
  maxParticipants: '',
  isOnline: false,
  materialsProvided: '',
  materialsNeededFromClub: '',
  venueRequirements: '',
  otherImportantInfo: '',
  detailsConfirmed: false,
};

export function validateCreateWorkshopForm(values: CreateWorkshopFormValues): string | null {
  if (!values.hostName.trim()) return 'Host name is required.';
  if (!values.title.trim()) return 'Workshop name/skill taught is required.';
  if (!values.category.trim()) return 'Category is required.';
  if (!values.contactNumber.trim()) return 'Contact number is required.';
  if (!values.date.trim()) return 'Confirmed workshop date is required.';
  if (!values.time.trim()) return 'Confirmed workshop time is required.';
  if (!values.duration.trim()) return 'Duration is required.';

  const parsedDuration = Number(values.duration);
  if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
    return 'Duration must be a positive integer in minutes.';
  }

  if (values.maxParticipants.trim()) {
    const parsedMaxParticipants = Number(values.maxParticipants);
    if (!Number.isInteger(parsedMaxParticipants) || parsedMaxParticipants <= 0) {
      return 'Max participants must be a positive integer, or leave it empty for N/A.';
    }
  }

  if (!values.detailsConfirmed) {
    return 'Please confirm that the details are accurate before submitting.';
  }

  return null;
}
