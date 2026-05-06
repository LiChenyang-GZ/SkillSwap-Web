import { useMemo } from 'react';
import { CREATE_WORKSHOP_INVALID_FIELD_CLASS_NAME } from '../constants/createWorkshopUiConstants';
import type { CreateWorkshopFormField, CreateWorkshopFormValues } from '../models/createWorkshopFormModel';
import type { CreateWorkshopFieldErrors } from '../models/createWorkshopValidationModel';
import { isCreateWorkshopFormSubmittable, validateCreateWorkshopValues } from '../utils/createWorkshopValidation';

interface UseCreateWorkshopValidationParams {
  values: CreateWorkshopFormValues;
  hasSubmitted: boolean;
}

export function useCreateWorkshopValidation({ values, hasSubmitted }: UseCreateWorkshopValidationParams) {
  const validationResult = useMemo(() => validateCreateWorkshopValues(values), [values]);
  const canSubmit = useMemo(() => isCreateWorkshopFormSubmittable(values), [values]);

  const fieldErrors: CreateWorkshopFieldErrors = hasSubmitted ? validationResult.fieldErrors : {};
  const error = hasSubmitted ? validationResult.formError : null;

  const getFieldError = (field: CreateWorkshopFormField): string | null => fieldErrors[field] ?? null;

  const getFieldClassName = (field: CreateWorkshopFormField) => {
    const fieldError = getFieldError(field);
    return `mt-1${fieldError ? ` ${CREATE_WORKSHOP_INVALID_FIELD_CLASS_NAME}` : ''}`;
  };

  return {
    validationResult,
    canSubmit,
    fieldErrors,
    error,
    invalidClassName: CREATE_WORKSHOP_INVALID_FIELD_CLASS_NAME,
    getFieldError,
    getFieldClassName,
  };
}
