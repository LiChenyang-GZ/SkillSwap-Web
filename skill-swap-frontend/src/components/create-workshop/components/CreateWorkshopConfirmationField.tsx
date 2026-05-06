import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import type { CreateWorkshopFormField, CreateWorkshopFormValues } from '../models/createWorkshopFormModel';

interface CreateWorkshopConfirmationFieldProps {
  values: CreateWorkshopFormValues;
  getFieldError: (field: CreateWorkshopFormField) => string | null;
  setField: (field: CreateWorkshopFormField, value: string | boolean) => void;
}

export function CreateWorkshopConfirmationField({
  values,
  getFieldError,
  setField,
}: CreateWorkshopConfirmationFieldProps) {
  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-md border border-border px-3 py-3${getFieldError('detailsConfirmed') ? ' border-destructive' : ''}`}
      >
        <Checkbox
          id="detailsConfirmed"
          checked={values.detailsConfirmed}
          onCheckedChange={(checked) => setField('detailsConfirmed', checked === true)}
        />
        <Label htmlFor="detailsConfirmed" className="leading-normal cursor-pointer">
          I confirm that the above details are accurate *
        </Label>
      </div>
      {getFieldError('detailsConfirmed') && (
        <p className="mt-2 text-xs text-destructive">{getFieldError('detailsConfirmed')}</p>
      )}
    </>
  );
}
