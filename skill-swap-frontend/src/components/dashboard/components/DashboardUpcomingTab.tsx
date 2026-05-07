import { Calendar, Clock, Globe, MapPin, BookOpen } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import type { Workshop } from "../../../types/workshop";
import { DashboardPagination } from "./DashboardPagination";
import {
  getUserWorkshopStatusBadgeVariant,
  getUserWorkshopStatusLabel,
  resolveUserWorkshopStatus,
} from "../../workshop/utils/workshopStatusPublicApi";

interface DashboardUpcomingTabProps {
  upcomingWorkshops: Workshop[];
  pagedUpcomingWorkshops: Workshop[];
  upcomingPage: number;
  upcomingTotalPages: number;
  statusBadgeClassName: string;
  onSetUpcomingPage: (page: number) => void;
  onOpenWorkshop: (workshopId: string) => void;
  onCancelWorkshopAttendance: (workshopId: string) => Promise<void>;
  onExploreWorkshops: () => void;
  isHostedByCurrentUser: (workshop: Workshop) => boolean;
}

export function DashboardUpcomingTab({
  upcomingWorkshops,
  pagedUpcomingWorkshops,
  upcomingPage,
  upcomingTotalPages,
  statusBadgeClassName,
  onSetUpcomingPage,
  onOpenWorkshop,
  onCancelWorkshopAttendance,
  onExploreWorkshops,
  isHostedByCurrentUser,
}: DashboardUpcomingTabProps) {
  const handleWorkshopCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, workshopId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenWorkshop(workshopId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Upcoming Workshops</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingWorkshops.length > 0 ? (
          <div className="space-y-4">
            {pagedUpcomingWorkshops.map((workshop) => (
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
                      {workshop.isOnline ? (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Online</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>{workshop.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={workshop.facilitator?.avatarUrl} alt={workshop.facilitator?.name || ""} />
                      <AvatarFallback className="text-xs">
                        {workshop.facilitator?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{workshop.facilitator?.name}</span>
                    <Badge variant="secondary">{workshop.category}</Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getUserWorkshopStatusBadgeVariant(workshop)} className={statusBadgeClassName}>
                    {getUserWorkshopStatusLabel(workshop) ?? "Upcoming"}
                  </Badge>
                  {resolveUserWorkshopStatus(workshop) === "upcoming" && !isHostedByCurrentUser(workshop) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onCancelWorkshopAttendance(workshop.id);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <DashboardPagination currentPage={upcomingPage} pageCount={upcomingTotalPages} onPageChange={onSetUpcomingPage} />
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No upcoming workshops</h3>
            <p className="text-muted-foreground mb-4">Explore workshops and join sessions you want to attend.</p>
            <Button onClick={onExploreWorkshops}>Explore Workshops</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
