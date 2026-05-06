import type { Workshop } from '../../../types/workshop';
import { WORKSHOP_ALL_CATEGORIES_OPTION } from '../constants/workshopExploreOptions';
import type { WorkshopExploreFilters } from '../models/workshopExploreFilterModel';
import { isUserWorkshopUpcomingOrOngoing } from './workshopStatusPublicApi';

export function filterExploreWorkshops(
  workshops: Workshop[],
  filters: WorkshopExploreFilters
): Workshop[] {
  const query = filters.searchQuery.toLowerCase();

  return workshops.filter((workshop) => {
    const facilitatorName = String(workshop.facilitator?.name || '').toLowerCase();
    const matchesSearch =
      workshop.title.toLowerCase().includes(query) ||
      workshop.description.toLowerCase().includes(query) ||
      facilitatorName.includes(query);

    const matchesCategory =
      filters.selectedCategory === WORKSHOP_ALL_CATEGORIES_OPTION ||
      workshop.category === filters.selectedCategory;

    return matchesSearch && matchesCategory && isUserWorkshopUpcomingOrOngoing(workshop);
  });
}
