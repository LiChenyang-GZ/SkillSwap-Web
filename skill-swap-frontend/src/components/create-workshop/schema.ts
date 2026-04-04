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

export type CreateWorkshopFieldErrors = Partial<Record<CreateWorkshopFormField, string>>;

export interface CreateWorkshopValidationResult {
  isValid: boolean;
  fieldErrors: CreateWorkshopFieldErrors;
  formError: string | null;
  firstInvalidField: CreateWorkshopFormField | null;
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

export function normalizeAustralianContactNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function validateFields(values: CreateWorkshopFormValues): CreateWorkshopFieldErrors {
  const fieldErrors: CreateWorkshopFieldErrors = {};

  if (!values.hostName.trim()) fieldErrors.hostName = 'Host name is required.';
  if (!values.title.trim()) fieldErrors.title = 'Workshop name/skill taught is required.';
  if (!values.category.trim()) fieldErrors.category = 'Category is required.';

  if (!values.contactNumber.trim()) {
    fieldErrors.contactNumber = 'Contact number is required.';
  } else {
    const normalizedContactNumber = normalizeAustralianContactNumber(values.contactNumber);
    if (!/^0\d{9}$/.test(normalizedContactNumber)) {
      fieldErrors.contactNumber = 'Please enter a valid Australian 10-digit number.';
    }
  }

  if (!values.date.trim()) fieldErrors.date = 'Confirmed workshop date is required.';
  if (!values.time.trim()) fieldErrors.time = 'Confirmed workshop time is required.';

  if (!values.duration.trim()) {
    fieldErrors.duration = 'Duration is required.';
  } else {
    const parsedDuration = Number(values.duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      fieldErrors.duration = 'Duration must be a positive integer in minutes.';
    }
  }

  if (values.maxParticipants.trim()) {
    const parsedMaxParticipants = Number(values.maxParticipants);
    if (!Number.isInteger(parsedMaxParticipants) || parsedMaxParticipants <= 0) {
      fieldErrors.maxParticipants = 'Maximum participants must be a positive integer.';
    }
  }

  if (!values.detailsConfirmed) {
    fieldErrors.detailsConfirmed = 'Please confirm that the details are accurate before submitting.';
  }

  return fieldErrors;
}

export function validateCreateWorkshopForm(values: CreateWorkshopFormValues): CreateWorkshopValidationResult {
  const fieldErrors = validateFields(values);
  const invalidFields = Object.keys(fieldErrors) as CreateWorkshopFormField[];

  return {
    isValid: invalidFields.length === 0,
    fieldErrors,
    formError: invalidFields.length > 0 ? 'Please review the highlighted fields before submitting.' : null,
    firstInvalidField: invalidFields[0] ?? null,
  };
}

export function isCreateWorkshopFormSubmittable(values: CreateWorkshopFormValues): boolean {
  return Boolean(
    values.hostName.trim() &&
      values.title.trim() &&
      values.category.trim() &&
      values.contactNumber.trim() &&
      values.date.trim() &&
      values.time.trim() &&
      values.duration.trim() &&
      values.detailsConfirmed
  );
}
