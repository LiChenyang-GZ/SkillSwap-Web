import { Calendar, Clock, Globe, MapPin } from 'lucide-react';
import type { Workshop } from '../../../types/workshop';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { getUserWorkshopStatusLabel, getWorkshopAccessLabel } from '../utils/workshopStatusPublicApi';

interface ExploreWorkshopCardProps {
  workshop: Workshop;
  onOpenWorkshop: (workshopId: string) => void;
}

export function ExploreWorkshopCard({ workshop, onOpenWorkshop }: ExploreWorkshopCardProps) {
  return (
    <Card
      className="group cursor-pointer border-0 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
      role="button"
      tabIndex={0}
      onClick={() => onOpenWorkshop(workshop.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenWorkshop(workshop.id);
        }
      }}
    >
      <CardContent className="p-0">
        <div className="aspect-[4/3] bg-muted rounded-t-lg overflow-hidden">
          {workshop.image && (
            <img
              src={workshop.image}
              alt={workshop.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          )}
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" className="max-w-full">
              {workshop.category}
            </Badge>
            <Badge variant="secondary">{getUserWorkshopStatusLabel(workshop) ?? 'Upcoming'}</Badge>
            <Badge variant="secondary">{getWorkshopAccessLabel(workshop)}</Badge>
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{workshop.title}</h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{workshop.description}</p>

          <div className="space-y-2 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(workshop.date).toLocaleDateString()}</span>
              <Clock className="w-4 h-4 ml-2" />
              <span>{workshop.time}</span>
            </div>
            <div className="flex items-center space-x-2">
              {workshop.isOnline ? (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">In-person</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
