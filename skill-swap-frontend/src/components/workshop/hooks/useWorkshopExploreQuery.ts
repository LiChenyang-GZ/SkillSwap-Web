import { useMemo } from 'react';
import type { Workshop } from '../../../types/workshop';
import type { WorkshopExploreFilters } from '../models/workshopExploreFilterModel';
import { filterExploreWorkshops } from '../utils/workshopExploreFilter';

interface UseWorkshopExploreQueryParams {
  workshops: Workshop[];
  filters: WorkshopExploreFilters;
}

export function useWorkshopExploreQuery({ workshops, filters }: UseWorkshopExploreQueryParams) {
  const filteredWorkshops = useMemo(() => {
    return filterExploreWorkshops(workshops, filters);
  }, [filters, workshops]);

  return {
    filteredWorkshops,
  };
}
