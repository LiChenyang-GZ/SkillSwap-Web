import { Calendar, Clock, Globe, MapPin } from 'lucide-react';
import type { Workshop } from '../../../types/workshop';
import { getWorkshopAccessLabel } from '../utils/workshopStatusPublicApi';
import { formatWorkshopDuration } from '../utils/workshopDetailMapper';

interface WorkshopDetailsSidebarProps {
  workshop: Workshop;
  attendCloseAt: Date | null;
}

export function WorkshopDetailsSidebar({ workshop, attendCloseAt }: WorkshopDetailsSidebarProps) {
  const durationLabel = formatWorkshopDuration(workshop.duration);
  const locationLabel = (() => {
    if (typeof workshop.location === 'string') {
      return workshop.location.trim() || 'To be confirmed by admin';
    }

    if (Array.isArray(workshop.location)) {
      const firstValidLocation = workshop.location.find(
        (item) => typeof item === 'string' && item.trim().length > 0
      );
      return firstValidLocation || 'To be confirmed by admin';
    }

    return 'To be confirmed by admin';
  })();

  return (
    <div className="bg-muted rounded-lg p-6 space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Access</p>
        <span className="text-lg font-semibold">{getWorkshopAccessLabel(workshop)}</span>
        <p className="text-sm text-muted-foreground mt-1">
          {attendCloseAt
            ? `Attendance closes at ${attendCloseAt.toLocaleString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}`
            : 'Attendance close time will be announced by admin.'}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Date</p>
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-base">
            {new Date(workshop.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Time</p>
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-base">{workshop.time}</span>
        </div>
      </div>

      {durationLabel && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Duration</p>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-base">{durationLabel}</span>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Location</p>
        <div className="flex items-start space-x-2">
          {workshop.isOnline ? (
            <>
              <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
              <span className="text-base">Online</span>
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <span className="text-base">{locationLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
