import { Search } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { WORKSHOP_EXPLORE_EMPTY_DESCRIPTION, WORKSHOP_EXPLORE_EMPTY_TITLE } from '../constants/workshopExploreUiConstants';

interface ExploreWorkshopsEmptyStateProps {
  onResetFilters: () => void;
}

export function ExploreWorkshopsEmptyState({ onResetFilters }: ExploreWorkshopsEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">{WORKSHOP_EXPLORE_EMPTY_TITLE}</h3>
        <p className="text-muted-foreground mb-6">{WORKSHOP_EXPLORE_EMPTY_DESCRIPTION}</p>
        <Button variant="outline" onClick={onResetFilters}>
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
}
