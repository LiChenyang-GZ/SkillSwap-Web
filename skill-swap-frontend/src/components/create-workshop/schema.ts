import { z } from 'zod';

const nonEmptyString = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, { message });

const positiveIntegerString = (value: string): boolean => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

export const createWorkshopFormSchema = z.object({
  hostName: nonEmptyString('Host name is required.'),
  title: nonEmptyString('Workshop name/skill taught is required.'),
  category: nonEmptyString('Category is required.'),
  contactNumber: z
    .string()
    .refine((value) => value.trim().length > 0, { message: 'Contact number is required.' })
    .refine((value) => /^0\d{9}$/.test(normalizeAustralianContactNumber(value)), {
      message: 'Please enter a valid Australian 10-digit number.',
    }),
  date: nonEmptyString('Confirmed workshop date is required.'),
  time: nonEmptyString('Confirmed workshop time is required.'),
  duration: z
    .string()
    .refine((value) => value.trim().length > 0, { message: 'Duration is required.' })
    .refine((value) => positiveIntegerString(value), {
      message: 'Duration must be a positive integer in minutes.',
    }),
  maxParticipants: z.string().refine((value) => !value.trim() || positiveIntegerString(value), {
    message: 'Maximum participants must be a positive integer.',
  }),
  isOnline: z.boolean(),
  materialsProvided: z.string(),
  materialsNeededFromClub: z.string(),
  venueRequirements: z.string(),
  otherImportantInfo: z.string(),
  detailsConfirmed: z.boolean().refine((value) => value, {
    message: 'Please confirm that the details are accurate before submitting.',
  }),
});

export type CreateWorkshopFormValues = z.infer<typeof createWorkshopFormSchema>;
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

export function normalizeAustralianContactNumber(value: string): string {
  return value.replace(/\D/g, '');
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
