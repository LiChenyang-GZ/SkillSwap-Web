import { Calendar, Clock, RefreshCw } from 'lucide-react';
import type { Workshop } from '../../../types/workshop';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { ADMIN_REVIEW_DESTRUCTIVE_BADGE_STATUSES } from '../constants/adminReviewStatusConstants';
import { resolveAdminDisplayStatus } from '../utils/adminReviewUtils';

interface AdminReviewListPanelProps {
  isLoading: boolean;
  sortedWorkshops: Workshop[];
  pagedWorkshops: Workshop[];
  selectedId: string | null;
  currentPage: number;
  totalPages: number;
  onSelect: (workshopId: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function AdminReviewListPanel({
  isLoading,
  sortedWorkshops,
  pagedWorkshops,
  selectedId,
  currentPage,
  totalPages,
  onSelect,
  onPrevPage,
  onNextPage,
}: AdminReviewListPanelProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Workshops</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && sortedWorkshops.length === 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading workshop submissions...
            </div>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="border rounded-lg p-3 animate-pulse">
                <div className="h-4 w-2/3 bg-muted rounded mb-2" />
                <div className="h-3 w-1/3 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : sortedWorkshops.length === 0 && !isLoading ? (
          <div className="text-sm text-muted-foreground">No workshops match this filter.</div>
        ) : (
          pagedWorkshops.map((workshop) => {
            const displayStatus = resolveAdminDisplayStatus(workshop);
            return (
              <button
                key={workshop.id}
                onClick={() => onSelect(workshop.id)}
                data-workshop-id={workshop.id}
                className={`w-full text-left border rounded-lg p-3 transition ${
                  selectedId === workshop.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium line-clamp-1">{workshop.title}</p>
                    <p className="text-xs text-muted-foreground">{workshop.facilitator?.name}</p>
                  </div>
                  <Badge
                    variant={ADMIN_REVIEW_DESTRUCTIVE_BADGE_STATUSES.includes(displayStatus as (typeof ADMIN_REVIEW_DESTRUCTIVE_BADGE_STATUSES)[number]) ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {displayStatus}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {workshop.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {workshop.time}
                  </span>
                </div>
              </button>
            );
          })
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <Button variant="outline" size="sm" onClick={onPrevPage} disabled={currentPage === 1}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={onNextPage} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
