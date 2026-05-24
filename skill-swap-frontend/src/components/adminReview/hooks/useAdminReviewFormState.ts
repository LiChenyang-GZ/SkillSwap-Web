import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import type { Workshop } from '../../../types/workshop';
import {
  IMAGE_UPLOAD_ALLOWED_MIME_TYPES,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_TOO_LARGE_MESSAGE,
  IMAGE_UPLOAD_UNSUPPORTED_MESSAGE,
} from '../../../shared/constants/uploadLimits';
import { WorkshopFormState, emptyWorkshopForm } from '../models/adminReviewFormModel';
import type { AdminReviewFieldErrors } from '../models/adminReviewValidationModel';
import { buildWorkshopFormState, normalizeFormState } from '../utils/adminReviewUtils';

interface UseAdminReviewFormStateParams {
  selectedWorkshop: Workshop | null;
  selectedHasDetail: boolean;
}

interface AdminReviewFormReducerState {
  formData: WorkshopFormState;
  pendingImageFile: File | null;
  localImagePreviewUrl: string | null;
  rejectComment: string;
  fieldErrors: AdminReviewFieldErrors;
  formError: string | null;
}

type AdminReviewFormAction =
  | { type: 'reset-from-workshop'; selectedWorkshop: Workshop | null }
  | { type: 'change-field'; field: keyof WorkshopFormState; value: string | boolean }
  | { type: 'set-image-file'; file: File | null }
  | { type: 'select-image-file'; file: File; previewUrl: string }
  | { type: 'clear-image-preview' }
  | { type: 'set-reject-comment'; value: string }
  | { type: 'set-validation'; errors: AdminReviewFieldErrors; formError: string | null }
  | { type: 'clear-validation' };

const buildInitialFormState = (selectedWorkshop: Workshop | null): AdminReviewFormReducerState => ({
  formData: selectedWorkshop ? buildWorkshopFormState(selectedWorkshop) : emptyWorkshopForm,
  pendingImageFile: null,
  localImagePreviewUrl: null,
  rejectComment: selectedWorkshop?.rejectionNote || '',
  fieldErrors: {},
  formError: null,
});

function adminReviewFormReducer(
  state: AdminReviewFormReducerState,
  action: AdminReviewFormAction
): AdminReviewFormReducerState {
  switch (action.type) {
    case 'reset-from-workshop':
      return buildInitialFormState(action.selectedWorkshop);
    case 'change-field': {
      const nextFieldErrors = { ...state.fieldErrors };
      delete nextFieldErrors[action.field];
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
        formError: null,
        fieldErrors: nextFieldErrors,
      };
    }
    case 'set-image-file':
      return {
        ...state,
        pendingImageFile: action.file,
      };
    case 'select-image-file':
      return {
        ...state,
        pendingImageFile: action.file,
        localImagePreviewUrl: action.previewUrl,
        formData: {
          ...state.formData,
          image: action.previewUrl,
        },
      };
    case 'clear-image-preview':
      return {
        ...state,
        localImagePreviewUrl: null,
      };
    case 'set-reject-comment':
      return {
        ...state,
        rejectComment: action.value,
      };
    case 'set-validation':
      return {
        ...state,
        fieldErrors: action.errors,
        formError: action.formError,
      };
    case 'clear-validation':
      return {
        ...state,
        fieldErrors: {},
        formError: null,
      };
    default:
      return state;
  }
}

const buildFormHydrationKey = (selectedWorkshop: Workshop | null, selectedHasDetail: boolean) =>
  selectedWorkshop ? `${selectedWorkshop.id}:${selectedHasDetail ? 'detail' : 'summary'}` : 'empty';

export function useAdminReviewFormState({ selectedWorkshop, selectedHasDetail }: UseAdminReviewFormStateParams) {
  const [state, dispatch] = useReducer(adminReviewFormReducer, selectedWorkshop, buildInitialFormState);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const localImagePreviewUrlRef = useRef<string | null>(null);
  const formHydrationKey = buildFormHydrationKey(selectedWorkshop, selectedHasDetail);
  const hydratedFormKeyRef = useRef(formHydrationKey);

  const isDirty = useMemo(() => {
    if (!selectedWorkshop) return false;
    const baseline = normalizeFormState(buildWorkshopFormState(selectedWorkshop));
    const current = normalizeFormState(state.formData);
    return JSON.stringify(baseline) !== JSON.stringify(current);
  }, [selectedWorkshop, state.formData]);

  const revokeLocalImagePreview = useCallback(() => {
    if (localImagePreviewUrlRef.current) {
      URL.revokeObjectURL(localImagePreviewUrlRef.current);
      localImagePreviewUrlRef.current = null;
    }
  }, []);

  const clearLocalImagePreview = useCallback(() => {
    revokeLocalImagePreview();
    dispatch({ type: 'clear-image-preview' });
  }, [revokeLocalImagePreview]);

  useEffect(() => {
    if (hydratedFormKeyRef.current === formHydrationKey) {
      return;
    }

    hydratedFormKeyRef.current = formHydrationKey;
    revokeLocalImagePreview();
    dispatch({ type: 'reset-from-workshop', selectedWorkshop });
  }, [formHydrationKey, revokeLocalImagePreview, selectedWorkshop]);

  useEffect(() => {
    return () => {
      revokeLocalImagePreview();
    };
  }, [revokeLocalImagePreview]);

  const handleInputChange = useCallback((field: keyof WorkshopFormState, value: string | boolean) => {
    dispatch({ type: 'change-field', field, value });
  }, []);

  const handleImageFileSelection = useCallback((file: File | null) => {
    if (!file) return;

    const contentType = String(file.type || '').toLowerCase();
    if (!IMAGE_UPLOAD_ALLOWED_MIME_TYPES.has(contentType)) {
      toast.error(IMAGE_UPLOAD_UNSUPPORTED_MESSAGE);
      return;
    }

    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      toast.error(IMAGE_UPLOAD_TOO_LARGE_MESSAGE);
      return;
    }

    clearLocalImagePreview();
    const previewUrl = URL.createObjectURL(file);
    localImagePreviewUrlRef.current = previewUrl;
    dispatch({ type: 'select-image-file', file, previewUrl });
  }, [clearLocalImagePreview]);

  const setValidationState = useCallback((errors: AdminReviewFieldErrors, nextFormError: string | null) => {
    dispatch({ type: 'set-validation', errors, formError: nextFormError });
  }, []);

  const clearValidationState = useCallback(() => {
    dispatch({ type: 'clear-validation' });
  }, []);

  const getFieldError = useCallback(
    (field: keyof WorkshopFormState) => state.fieldErrors[field] ?? null,
    [state.fieldErrors]
  );

  const setPendingImageFile = useCallback((file: File | null) => {
    dispatch({ type: 'set-image-file', file });
  }, []);

  const setRejectComment = useCallback((value: string) => {
    dispatch({ type: 'set-reject-comment', value });
  }, []);

  return {
    formData: state.formData,
    fieldErrors: state.fieldErrors,
    formError: state.formError,
    pendingImageFile: state.pendingImageFile,
    setPendingImageFile,
    localImagePreviewUrl: state.localImagePreviewUrl,
    rejectComment: state.rejectComment,
    setRejectComment,
    imageFileInputRef,
    isDirty,
    clearLocalImagePreview,
    setValidationState,
    clearValidationState,
    getFieldError,
    handleInputChange,
    handleImageFileSelection,
  };
}
