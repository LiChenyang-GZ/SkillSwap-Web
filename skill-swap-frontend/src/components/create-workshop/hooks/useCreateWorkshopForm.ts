import { useRef, useState } from 'react';
import { CREATE_WORKSHOP_FIELD_ELEMENT_ID_MAP } from '../constants/createWorkshopUiConstants';
import { defaultCreateWorkshopFormValues, type CreateWorkshopFormField, type CreateWorkshopFormValues } from '../models/createWorkshopFormModel';

export function useCreateWorkshopForm() {
  const [values, setValues] = useState<CreateWorkshopFormValues>(defaultCreateWorkshopFormValues);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const setField = (field: CreateWorkshopFormField, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const focusFirstInvalidField = (field: CreateWorkshopFormField | null) => {
    if (!field) return;
    requestAnimationFrame(() => {
      const targetId = CREATE_WORKSHOP_FIELD_ELEMENT_ID_MAP[field];
      const target = document.getElementById(targetId);
      if (target instanceof HTMLElement) {
        target.focus();
      }
    });
  };

  const scrollToFormTop = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return {
    values,
    hasSubmitted,
    formRef,
    setValues,
    setHasSubmitted,
    setField,
    focusFirstInvalidField,
    scrollToFormTop,
  };
}
