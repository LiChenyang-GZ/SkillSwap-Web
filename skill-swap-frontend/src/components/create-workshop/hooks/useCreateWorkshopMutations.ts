import { useState } from 'react';
import { toast } from 'sonner';
import { CREATE_WORKSHOP_TOAST_CREATING } from '../constants/createWorkshopStatusConstants';
import { useApp } from '../../../contexts/AppContext';
import type { CreateWorkshopFormValues } from '../models/createWorkshopFormModel';
import { toWorkshopUpsertPayload } from '../utils/createWorkshopMapper';

export function useCreateWorkshopMutations() {
  const { createWorkshop, setCurrentPage } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (values: CreateWorkshopFormValues): Promise<boolean> => {
    if (isSubmitting) return false;

    setIsSubmitting(true);
    const loadingToastId = toast.loading(CREATE_WORKSHOP_TOAST_CREATING);

    try {
      const payload = toWorkshopUpsertPayload(values);
      await createWorkshop(payload);
      toast.dismiss(loadingToastId);
      setCurrentPage('dashboard');
      return true;
    } catch {
      toast.dismiss(loadingToastId);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submit,
  };
}
