import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "../../../contexts/AppContext";
import { OTHER_OPTION } from "../constants/universityOptions";
import { resolveUniversity, toUniversityDraft } from "../utils/universityMapper";

// Owns the onboarding university form state and the save/navigation orchestration
// so the screen stays render-only.
export function useUniversityOnboardingForm() {
  const { updateCurrentUserProfile, setCurrentPage, user } = useApp();
  const initialDraft = toUniversityDraft(user?.university);
  const [selection, setSelection] = useState(initialDraft.selection);
  const [customName, setCustomName] = useState(initialDraft.customName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selection) {
      setError("Please select your university.");
      return;
    }

    const university = resolveUniversity(selection, customName);
    if (selection === OTHER_OPTION && university.length < 2) {
      setError("Please enter your university name.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateCurrentUserProfile({ university });
      toast.success("Your campus has been added.");
      setCurrentPage("explore");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save your university.");
    } finally {
      setIsSaving(false);
    }
  };

  return { selection, setSelection, customName, setCustomName, isSaving, error, handleSubmit };
}
