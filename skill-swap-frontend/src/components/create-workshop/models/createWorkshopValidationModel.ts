import type { CreateWorkshopFormField } from './createWorkshopFormModel';

export type CreateWorkshopFieldErrors = Partial<Record<CreateWorkshopFormField, string>>;

export interface CreateWorkshopValidationResult {
  isValid: boolean;
  fieldErrors: CreateWorkshopFieldErrors;
  formError: string | null;
  firstInvalidField: CreateWorkshopFormField | null;
}
