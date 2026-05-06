import { z } from 'zod';
import type { WorkshopFormState } from '../models/adminReviewFormModel';
import type { AdminReviewFieldErrors, AdminReviewValidationResult } from '../models/adminReviewValidationModel';

const nonEmptyString = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { message });

const positiveIntegerString = (value: string): boolean => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

const adminReviewWorkshopFormSchema = z.object({
  hostName: nonEmptyString('Host name is required.'),
  title: nonEmptyString('Workshop name/skill taught is required.'),
  category: nonEmptyString('Category is required.'),
  contactNumber: z
    .string()
    .refine((value) => value.trim().length > 0, { message: 'Contact number is required.' })
    .refine((value) => /^0\d{9}$/.test(value.replace(/\D/g, '')), {
      message: 'Please enter a valid Australian 10-digit number.',
    }),
  date: nonEmptyString('Workshop date is required.'),
  time: nonEmptyString('Workshop time is required.'),
  duration: z
    .string()
    .refine((value) => value.trim().length > 0, { message: 'Duration is required.' })
    .refine((value) => positiveIntegerString(value), {
      message: 'Duration must be a positive integer in minutes.',
    }),
  maxParticipants: z.string().refine((value) => !value.trim() || positiveIntegerString(value), {
    message: 'Max participants must be a positive integer.',
  }),
  attendCloseAt: z.string(),
  weekNumber: z.string().refine((value) => !value.trim() || positiveIntegerString(value), {
    message: 'Week # must be a positive integer.',
  }),
  description: z.string(),
  location: z.string(),
  isOnline: z.boolean(),
  materialsProvided: z.string(),
  materialsNeededFromClub: z.string(),
  venueRequirements: z.string(),
  otherImportantInfo: z.string(),
  memberResponsible: z.string(),
  membersPresent: z.string(),
  eventSubmitted: z.enum(['true', 'false']),
  usuApprovalStatus: z.enum(['pending', 'approved']),
  detailsConfirmed: z.boolean(),
  image: z.string(),
});

const validationFieldOrder: (keyof WorkshopFormState)[] = [
  'hostName',
  'title',
  'category',
  'contactNumber',
  'date',
  'time',
  'duration',
  'maxParticipants',
  'weekNumber',
];

export function validateAdminReviewWorkshopForm(values: WorkshopFormState): AdminReviewValidationResult {
  const parsed = adminReviewWorkshopFormSchema.safeParse(values);
  if (parsed.success) {
    return {
      isValid: true,
      fieldErrors: {},
      formError: null,
    };
  }

  const fieldErrors: AdminReviewFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const fieldName = issue.path[0];
    if (typeof fieldName !== 'string') continue;
    const field = fieldName as keyof WorkshopFormState;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  const firstInvalidField = validationFieldOrder.find((field) => Boolean(fieldErrors[field]));
  const formError =
    (firstInvalidField && fieldErrors[firstInvalidField]) || 'Please review the highlighted fields before saving.';

  return {
    isValid: false,
    fieldErrors,
    formError,
  };
}
