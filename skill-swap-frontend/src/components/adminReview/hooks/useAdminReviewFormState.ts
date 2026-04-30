import { useEffect, useRef, useState } from 'react';
import type { Workshop } from '../../../types/workshop';
import { WorkshopFormState, emptyWorkshopForm } from '../models/adminReviewFormModel';
import { buildWorkshopFormState, normalizeFormState } from '../utils/adminReviewUtils';

interface UseAdminReviewFormStateParams {
  selectedWorkshop: Workshop | null;
}

export function useAdminReviewFormState({ selectedWorkshop }: UseAdminReviewFormStateParams) {
  const [formData, setFormData] = useState<WorkshopFormState>(emptyWorkshopForm);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = (() => {
    if (!selectedWorkshop) return false;
    const baseline = normalizeFormState(buildWorkshopFormState(selectedWorkshop));
    const current = normalizeFormState(formData);
    return JSON.stringify(baseline) !== JSON.stringify(current);
  })();

  const clearLocalImagePreview = () => {
    setLocalImagePreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  useEffect(() => {
    if (!selectedWorkshop) {
      setFormData(emptyWorkshopForm);
      setPendingImageFile(null);
      clearLocalImagePreview();
      setRejectComment('');
      return;
    }

    setPendingImageFile(null);
    clearLocalImagePreview();
    setFormData(buildWorkshopFormState(selectedWorkshop));
    setRejectComment(selectedWorkshop.rejectionNote || '');
  }, [selectedWorkshop]);

  useEffect(() => {
    return () => {
      clearLocalImagePreview();
    };
  }, []);

  const handleInputChange = (field: keyof WorkshopFormState, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageFileSelection = (file: File | null) => {
    if (!file) return;

    clearLocalImagePreview();
    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreviewUrl(previewUrl);
    setPendingImageFile(file);
    setFormData((prev) => ({
      ...prev,
      image: previewUrl,
    }));
  };

  return {
    formData,
    pendingImageFile,
    setPendingImageFile,
    localImagePreviewUrl,
    rejectComment,
    setRejectComment,
    imageFileInputRef,
    isDirty,
    clearLocalImagePreview,
    handleInputChange,
    handleImageFileSelection,
  };
}
