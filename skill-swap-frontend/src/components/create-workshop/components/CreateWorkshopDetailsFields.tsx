import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import type { CreateWorkshopFormField, CreateWorkshopFormValues } from '../models/createWorkshopFormModel';

interface CreateWorkshopDetailsFieldsProps {
  values: CreateWorkshopFormValues;
  setField: (field: CreateWorkshopFormField, value: string | boolean) => void;
}

export function CreateWorkshopDetailsFields({ values, setField }: CreateWorkshopDetailsFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="materialsProvided">Materials you will provide (optional)</Label>
          <Textarea
            id="materialsProvided"
            rows={3}
            autoComplete="off"
            value={values.materialsProvided}
            onChange={(event) => setField('materialsProvided', event.target.value)}
            className="mt-1"
            placeholder="e.g., brushes, printed worksheet"
          />
        </div>
        <div>
          <Label htmlFor="materialsNeededFromClub">Materials required from Skill Swap Club (optional)</Label>
          <Textarea
            id="materialsNeededFromClub"
            rows={3}
            autoComplete="off"
            value={values.materialsNeededFromClub}
            onChange={(event) => setField('materialsNeededFromClub', event.target.value)}
            className="mt-1"
            placeholder="e.g., projector, extra tables"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="venueRequirements">Requirements on the venue (optional)</Label>
          <Textarea
            id="venueRequirements"
            rows={3}
            autoComplete="off"
            value={values.venueRequirements}
            onChange={(event) => setField('venueRequirements', event.target.value)}
            className="mt-1"
            placeholder="e.g., room size, table setup"
          />
        </div>
        <div>
          <Label htmlFor="otherImportantInfo">Any other important information (optional)</Label>
          <Textarea
            id="otherImportantInfo"
            rows={3}
            autoComplete="off"
            value={values.otherImportantInfo}
            onChange={(event) => setField('otherImportantInfo', event.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </>
  );
}
