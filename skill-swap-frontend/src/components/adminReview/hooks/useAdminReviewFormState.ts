import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { WorkshopFormState, emptyWorkshopForm } from '../models/adminReviewFormModel';
import type { AdminReviewFieldErrors } from '../models/adminReviewValidationModel';
import { buildWorkshopFormState, normalizeFormState } from '../utils/adminReviewUtils';

interface UseAdminReviewFormStateParams {
  selectedWorkshop: Workshop | null;
}

export function useAdminReviewFormState({ selectedWorkshop }: UseAdminReviewFormStateParams) {
  const [formData, setFormData] = useState<WorkshopFormState>(emptyWorkshopForm);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AdminReviewFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    if (!selectedWorkshop) return false;
    const baseline = normalizeFormState(buildWorkshopFormState(selectedWorkshop));
    const current = normalizeFormState(formData);
    return JSON.stringify(baseline) !== JSON.stringify(current);
  }, [selectedWorkshop, formData]);

  const clearLocalImagePreview = useCallback(() => {
    setLocalImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (!selectedWorkshop) {
      setFormData(emptyWorkshopForm);
      setPendingImageFile(null);
      clearLocalImagePreview();
      setRejectComment('');
      setFieldErrors({});
      setFormError(null);
      return;
    }

    setPendingImageFile(null);
    clearLocalImagePreview();
    setFormData(buildWorkshopFormState(selectedWorkshop));
    setRejectComment(selectedWorkshop.rejectionNote || '');
    setFieldErrors({});
    setFormError(null);
  }, [selectedWorkshop, clearLocalImagePreview]);

  useEffect(() => {
    return () => {
      clearLocalImagePreview();
    };
  }, [clearLocalImagePreview]);

  const handleInputChange = useCallback((field: keyof WorkshopFormState, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const handleImageFileSelection = useCallback((file: File | null) => {
    if (!file) return;

    clearLocalImagePreview();
    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreviewUrl(previewUrl);
    setPendingImageFile(file);
    setFormData((prev) => ({
      ...prev,
      image: previewUrl,
    }));
  }, [clearLocalImagePreview]);

  const setValidationState = useCallback((errors: AdminReviewFieldErrors, nextFormError: string | null) => {
    setFieldErrors(errors);
    setFormError(nextFormError);
  }, []);

  const clearValidationState = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const getFieldError = useCallback(
    (field: keyof WorkshopFormState) => fieldErrors[field] ?? null,
    [fieldErrors]
  );

  return {
    formData,
    fieldErrors,
    formError,
    pendingImageFile,
    setPendingImageFile,
    localImagePreviewUrl,
    rejectComment,
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
