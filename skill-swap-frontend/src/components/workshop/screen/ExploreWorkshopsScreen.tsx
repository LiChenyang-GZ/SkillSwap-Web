import { ArrowRight } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { ExploreWorkshopCard } from '../components/ExploreWorkshopCard';
import { ExploreWorkshopsEmptyState } from '../components/ExploreWorkshopsEmptyState';
import { ExploreWorkshopsFilters } from '../components/ExploreWorkshopsFilters';
import { ExploreWorkshopsHeader } from '../components/ExploreWorkshopsHeader';
import { useWorkshopExploreQuery } from '../hooks/useWorkshopExploreQuery';
import { useWorkshopExploreSelection } from '../hooks/useWorkshopExploreSelection';

// Public workshop-request Google Form.
// NOTE: this is the /viewform variant of the form owner's /edit link. If public
// (logged-out) users cannot open it, replace it with the real shareable link
// from Google Forms → "Send" → link (a forms.gle/... or /d/e/.../viewform URL).
const WORKSHOP_REQUEST_FORM_URL =
  'https://docs.google.com/forms/d/1mNi5ny7r6DPUuaNXOIXzAw4sd12rM1Cx5WU58CqrHBk/viewform';

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

        <section
          aria-labelledby="workshop-request-heading"
          className="mt-14 rounded-[1.75rem] border border-foreground/10 bg-card p-6 text-center sm:p-10"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Can't find your thing?</p>
          <h2 id="workshop-request-heading" className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
            Didn't find a workshop you like?
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
            Tell us what you'd love to learn in a quick form and we'll help match you with a swap — or find a student to
            host one.
          </p>
          <a
            href={WORKSHOP_REQUEST_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Request a workshop
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}
