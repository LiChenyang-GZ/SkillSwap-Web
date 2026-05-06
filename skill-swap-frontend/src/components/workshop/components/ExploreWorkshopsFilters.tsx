import { Search } from 'lucide-react';
import { workshopCategories } from '../../../constants/workshop';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { WORKSHOP_ALL_CATEGORIES_OPTION } from '../constants/workshopExploreOptions';
import { WORKSHOP_EXPLORE_SEARCH_PLACEHOLDER } from '../constants/workshopExploreUiConstants';

interface ExploreWorkshopsFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export function ExploreWorkshopsFilters({
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}: ExploreWorkshopsFiltersProps) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={WORKSHOP_EXPLORE_SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={onCategoryChange} modal={false}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WORKSHOP_ALL_CATEGORIES_OPTION}>All Categories</SelectItem>
            {workshopCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
