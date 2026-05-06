import { useApp } from '../../../contexts/AppContext';
import { ExploreWorkshopCard } from '../components/ExploreWorkshopCard';
import { ExploreWorkshopsEmptyState } from '../components/ExploreWorkshopsEmptyState';
import { ExploreWorkshopsFilters } from '../components/ExploreWorkshopsFilters';
import { ExploreWorkshopsHeader } from '../components/ExploreWorkshopsHeader';
import { useWorkshopExploreQuery } from '../hooks/useWorkshopExploreQuery';
import { useWorkshopExploreSelection } from '../hooks/useWorkshopExploreSelection';

export function ExploreWorkshopsScreen() {
  const { workshops, setCurrentPage } = useApp();
  const selection = useWorkshopExploreSelection();
  const query = useWorkshopExploreQuery({
    workshops,
    filters: selection.filters,
  });

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExploreWorkshopsHeader />

        <ExploreWorkshopsFilters
          searchQuery={selection.searchQuery}
          selectedCategory={selection.selectedCategory}
          onSearchChange={selection.setSearchQuery}
          onCategoryChange={selection.setSelectedCategory}
        />

        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {query.filteredWorkshops.length} workshop
            {query.filteredWorkshops.length !== 1 ? 's' : ''}
          </p>
        </div>

        {query.filteredWorkshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {query.filteredWorkshops.map((workshop) => (
              <ExploreWorkshopCard
                key={workshop.id}
                workshop={workshop}
                onOpenWorkshop={(workshopId) => setCurrentPage(`workshop-${workshopId}`)}
              />
            ))}
          </div>
        ) : (
          <ExploreWorkshopsEmptyState onResetFilters={selection.resetFilters} />
        )}
      </div>
    </div>
  );
}
