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

export type CreateWorkshopFormField = keyof CreateWorkshopFormValues;

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
