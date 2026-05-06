import { ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { WORKSHOP_DETAILS_BACK_TO_EXPLORE_LABEL } from '../constants/workshopDetailUiConstants';

interface WorkshopDetailsBackButtonProps {
  onBack: () => void;
}

export function WorkshopDetailsBackButton({ onBack }: WorkshopDetailsBackButtonProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="mb-6">
      <ArrowLeft className="w-4 h-4 mr-2" />
      {WORKSHOP_DETAILS_BACK_TO_EXPLORE_LABEL}
    </Button>
  );
}
