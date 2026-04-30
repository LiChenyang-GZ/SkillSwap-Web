export interface WorkshopFormState {
  image: string;
  hostName: string;
  title: string;
  description: string;
  category: string;
  contactNumber: string;
  duration: string;
  maxParticipants: string;
  date: string;
  time: string;
  attendCloseAt: string;
  location: string;
  isOnline: boolean;
  materialsProvided: string;
  materialsNeededFromClub: string;
  venueRequirements: string;
  otherImportantInfo: string;
  weekNumber: string;
  memberResponsible: string;
  membersPresent: string;
  eventSubmitted: 'true' | 'false';
  usuApprovalStatus: 'pending' | 'approved';
  detailsConfirmed: boolean;
}

export const emptyWorkshopForm: WorkshopFormState = {
  image: '',
  hostName: '',
  title: '',
  description: '',
  category: '',
  contactNumber: '',
  duration: '',
  maxParticipants: '',
  date: '',
  time: '',
  attendCloseAt: '',
  location: '',
  isOnline: false,
  materialsProvided: '',
  materialsNeededFromClub: '',
  venueRequirements: '',
  otherImportantInfo: '',
  weekNumber: '',
  memberResponsible: '',
  membersPresent: '',
  eventSubmitted: 'false',
  usuApprovalStatus: 'pending',
  detailsConfirmed: false,
};
