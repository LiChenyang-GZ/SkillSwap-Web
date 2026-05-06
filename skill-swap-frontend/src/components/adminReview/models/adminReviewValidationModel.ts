import type { WorkshopFormState } from './adminReviewFormModel';

export type AdminReviewFieldErrors = Partial<Record<keyof WorkshopFormState, string>>;

export interface AdminReviewValidationResult {
  isValid: boolean;
  fieldErrors: AdminReviewFieldErrors;
  formError: string | null;
}
