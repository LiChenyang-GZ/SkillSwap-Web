import { Calendar, Clock, Target, Trash2, Users } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import type { Workshop } from "../../../types/workshop";
import { getWorkshopAccessLabel } from "../../workshop/utils/workshopStatusPublicApi";
import { getHostingStatusMeta } from "../utils/dashboardWorkshopUtils";
import { DashboardPagination } from "./DashboardPagination";

interface DashboardHostingTabProps {
  hostingWorkshops: Workshop[];
  pagedHostingWorkshops: Workshop[];
  hostingPage: number;
  hostingTotalPages: number;
  statusBadgeClassName: string;
  hidingWorkshopIds: string[];
  onSetHostingPage: (page: number) => void;
  onOpenWorkshop: (workshopId: string) => void;
  onHideHostedWorkshopFromView: (workshopId: string) => Promise<void>;
  onHostWorkshop: () => void;
}

export function DashboardHostingTab({
  hostingWorkshops,
  pagedHostingWorkshops,
  hostingPage,
  hostingTotalPages,
  statusBadgeClassName,
  hidingWorkshopIds,
  onSetHostingPage,
  onOpenWorkshop,
  onHideHostedWorkshopFromView,
  onHostWorkshop,
}: DashboardHostingTabProps) {
  const handleWorkshopCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, workshopId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenWorkshop(workshopId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hosting Workshops</CardTitle>
      </CardHeader>
      <CardContent>
        {hostingWorkshops.length > 0 ? (
          <div className="space-y-4">
            {pagedHostingWorkshops.map((workshop) => {
              const statusMeta = getHostingStatusMeta(workshop);

              return (
                <div
                  key={workshop.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenWorkshop(workshop.id)}
                  onKeyDown={(event) => handleWorkshopCardKeyDown(event, workshop.id)}
                  className="flex items-center justify-between p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/60"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{workshop.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(workshop.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{workshop.time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>
                          {workshop.currentParticipants}/{workshop.maxParticipants}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{workshop.category}</Badge>
                      <Badge variant="outline">{getWorkshopAccessLabel(workshop)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {statusMeta.removable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove from hosting list"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={hidingWorkshopIds.includes(workshop.id)}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void onHideHostedWorkshopFromView(workshop.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Badge variant={statusMeta.variant} className={statusBadgeClassName}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
            <DashboardPagination currentPage={hostingPage} pageCount={hostingTotalPages} onPageChange={onSetHostingPage} />
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No hosting workshops to show</h3>
            <p className="text-muted-foreground mb-4">
              Host a workshop, or remove rejected/cancelled items from this list.
            </p>
            <Button onClick={onHostWorkshop} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Host a Workshop
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
