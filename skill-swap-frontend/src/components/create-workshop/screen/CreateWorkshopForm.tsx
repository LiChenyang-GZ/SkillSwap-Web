import type { FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { CreateWorkshopBasicFields } from '../components/CreateWorkshopBasicFields';
import { CreateWorkshopDetailsFields } from '../components/CreateWorkshopDetailsFields';
import { CreateWorkshopConfirmationField } from '../components/CreateWorkshopConfirmationField';
import { CreateWorkshopFormActions } from '../components/CreateWorkshopFormActions';
import { useCreateWorkshopForm } from '../hooks/useCreateWorkshopForm';
import { useCreateWorkshopValidation } from '../hooks/useCreateWorkshopValidation';
import { useCreateWorkshopMutations } from '../hooks/useCreateWorkshopMutations';

export function CreateWorkshopForm() {
  const form = useCreateWorkshopForm();
  const validation = useCreateWorkshopValidation({ values: form.values, hasSubmitted: form.hasSubmitted });
  const mutations = useCreateWorkshopMutations();

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validation.validationResult.isValid) {
      form.setHasSubmitted(true);
      form.scrollToFormTop();
      form.focusFirstInvalidField(validation.validationResult.firstInvalidField);
      return;
    }

    form.setHasSubmitted(false);
    await mutations.submit(form.values);
  };

  return (
    <form ref={form.formRef} onSubmit={handleFormSubmit} className="space-y-6" autoComplete="off">
      {/* Keep these hidden fields to discourage browser autofill from overwriting workshop form inputs. */}
      <input tabIndex={-1} aria-hidden="true" autoComplete="username" className="hidden" />
      <input tabIndex={-1} aria-hidden="true" type="password" autoComplete="new-password" className="hidden" />
      {validation.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{validation.error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Final Workshop Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateWorkshopBasicFields
            values={form.values}
            invalidClassName={validation.invalidClassName}
            getFieldError={validation.getFieldError}
            getFieldClassName={validation.getFieldClassName}
            setField={form.setField}
          />
          <CreateWorkshopDetailsFields values={form.values} setField={form.setField} />
          <CreateWorkshopConfirmationField
            values={form.values}
            getFieldError={validation.getFieldError}
            setField={form.setField}
          />
        </CardContent>
      </Card>

      <CreateWorkshopFormActions canSubmit={validation.canSubmit} isSubmitting={mutations.isSubmitting} />
    </form>
  );
}
