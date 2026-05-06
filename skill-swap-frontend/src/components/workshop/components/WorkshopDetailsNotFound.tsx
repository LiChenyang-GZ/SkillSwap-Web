import {
  WORKSHOP_DETAILS_NOT_FOUND_DESCRIPTION,
  WORKSHOP_DETAILS_NOT_FOUND_TITLE,
} from '../constants/workshopDetailUiConstants';
import { WorkshopDetailsBackButton } from './WorkshopDetailsBackButton';

interface WorkshopDetailsNotFoundProps {
  onBack: () => void;
  title?: string;
  description?: string;
}

export function WorkshopDetailsNotFound({
  onBack,
  title = WORKSHOP_DETAILS_NOT_FOUND_TITLE,
  description = WORKSHOP_DETAILS_NOT_FOUND_DESCRIPTION,
}: WorkshopDetailsNotFoundProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WorkshopDetailsBackButton onBack={onBack} />
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
