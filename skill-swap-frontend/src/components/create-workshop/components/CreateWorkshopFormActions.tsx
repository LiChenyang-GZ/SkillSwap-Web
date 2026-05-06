import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../components/ui/button';

interface CreateWorkshopFormActionsProps {
  canSubmit: boolean;
  isSubmitting: boolean;
}

export function CreateWorkshopFormActions({ canSubmit, isSubmitting }: CreateWorkshopFormActionsProps) {
  const { setCurrentPage } = useApp();

  return (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={() => setCurrentPage('dashboard')}>
        Cancel
      </Button>
      <Button type="submit" disabled={!canSubmit || isSubmitting} className="min-w-[140px]">
        {isSubmitting ? 'Creating...' : 'Create Workshop'}
      </Button>
    </div>
  );
}
