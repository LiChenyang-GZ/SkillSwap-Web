import type { Workshop } from '../../../types/workshop';

export interface WorkshopExploreFilters {
  searchQuery: string;
  selectedCategory: string;
}

export interface WorkshopExploreQueryResult {
  filteredWorkshops: Workshop[];
}
