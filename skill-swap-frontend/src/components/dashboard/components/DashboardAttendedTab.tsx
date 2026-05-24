import { BookOpen, Calendar, Clock } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import type { Workshop } from "../../../types/workshop";
import { DashboardPagination } from "./DashboardPagination";

interface DashboardAttendedTabProps {
  attendedWorkshops: Workshop[];
  pagedAttendedWorkshops: Workshop[];
  attendedPage: number;
  attendedTotalPages: number;
  statusBadgeClassName: string;
  onSetAttendedPage: (page: number) => void;
  onOpenWorkshop: (workshopId: string) => void;
}

export function DashboardAttendedTab({
  attendedWorkshops,
  pagedAttendedWorkshops,
  attendedPage,
  attendedTotalPages,
  statusBadgeClassName,
  onSetAttendedPage,
  onOpenWorkshop,
}: DashboardAttendedTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attended Workshops</CardTitle>
      </CardHeader>
      <CardContent>
        {attendedWorkshops.length > 0 ? (
          <div className="space-y-4">
            {pagedAttendedWorkshops.map((workshop) => (
              <button
                key={workshop.id}
                type="button"
                onClick={() => onOpenWorkshop(workshop.id)}
                className="w-full flex items-center justify-between p-4 border border-border rounded-lg text-left cursor-pointer hover:bg-muted/60 bg-transparent"
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
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">{workshop.category}</Badge>
                  </div>
                </div>
                <Badge variant="outline" className={statusBadgeClassName}>
                  Completed
                </Badge>
              </button>
            ))}
            <DashboardPagination currentPage={attendedPage} pageCount={attendedTotalPages} onPageChange={onSetAttendedPage} />
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No attended workshops yet</h3>
            <p className="text-muted-foreground mb-4">Workshops you have completed will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
