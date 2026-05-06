import { useMemo, useState } from 'react';
import { WORKSHOP_ALL_CATEGORIES_OPTION } from '../constants/workshopExploreOptions';
import type { WorkshopExploreFilters } from '../models/workshopExploreFilterModel';

export function useWorkshopExploreSelection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(WORKSHOP_ALL_CATEGORIES_OPTION);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(WORKSHOP_ALL_CATEGORIES_OPTION);
  };

  const filters: WorkshopExploreFilters = useMemo(
    () => ({
      searchQuery,
      selectedCategory,
    }),
    [searchQuery, selectedCategory]
  );

  return {
    filters,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    resetFilters,
  };
}
