import type { CreateWorkshopFieldElementIdMap } from '../models/createWorkshopViewModel';
import type { CreateWorkshopFormField } from '../models/createWorkshopFormModel';

export const CREATE_WORKSHOP_INVALID_FIELD_CLASS_NAME = 'border-destructive focus-visible:ring-destructive';

export const CREATE_WORKSHOP_FIELD_ELEMENT_ID_MAP: CreateWorkshopFieldElementIdMap = {
  hostName: 'hostName',
  title: 'title',
  category: 'category-trigger',
  contactNumber: 'contactNumber',
  date: 'date',
  time: 'time',
  duration: 'duration',
  maxParticipants: 'maxParticipants',
  isOnline: 'isOnline',
  materialsProvided: 'materialsProvided',
  materialsNeededFromClub: 'materialsNeededFromClub',
  venueRequirements: 'venueRequirements',
  otherImportantInfo: 'otherImportantInfo',
  detailsConfirmed: 'detailsConfirmed',
};

export const CREATE_WORKSHOP_VALIDATION_FIELD_ORDER: CreateWorkshopFormField[] = [
  'hostName',
  'title',
  'category',
  'contactNumber',
  'date',
  'time',
  'duration',
  'maxParticipants',
  'detailsConfirmed',
];
