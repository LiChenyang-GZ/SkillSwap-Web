import { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { toWorkshopUpsertPayload } from './dto';
import type { CreateWorkshopFormValues } from './schema';

export function useCreateWorkshopSubmit() {
  const { createWorkshop, setCurrentPage } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (values: CreateWorkshopFormValues): Promise<boolean> => {
    if (isSubmitting) return false;

    setIsSubmitting(true);
    const loadingToastId = toast.loading('Creating workshop...');

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
