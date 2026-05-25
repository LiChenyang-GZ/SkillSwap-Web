import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { WORKSHOP_EXPLORE_EMPTY_DESCRIPTION, WORKSHOP_EXPLORE_EMPTY_TITLE } from '../constants/workshopExploreUiConstants';

const FOX_EMPTY_WORKSHOP_SRC = '/brand/fox-empty-workshop.png';

interface ExploreWorkshopsEmptyStateProps {
  onResetFilters: () => void;
}

export function ExploreWorkshopsEmptyState({ onResetFilters }: ExploreWorkshopsEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <img
          src={FOX_EMPTY_WORKSHOP_SRC}
          alt=""
          aria-hidden="true"
          className="mx-auto mb-5 h-36 w-36 object-contain sm:h-44 sm:w-44"
        />
        <h3 className="text-xl font-semibold mb-2">{WORKSHOP_EXPLORE_EMPTY_TITLE}</h3>
        <p className="text-muted-foreground mb-6">{WORKSHOP_EXPLORE_EMPTY_DESCRIPTION}</p>
        <Button variant="outline" onClick={onResetFilters}>
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
}
