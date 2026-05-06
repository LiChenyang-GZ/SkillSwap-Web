import { Users } from 'lucide-react';
import type { Workshop } from '../../../types/workshop';
import type { WorkshopDetailGuardState } from '../models/workshopDetailViewModel';
import { WorkshopDetailsActionPanel } from './WorkshopDetailsActionPanel';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';

interface WorkshopDetailsMainContentProps {
  workshop: Workshop;
  isAdmin: boolean;
  guardState: WorkshopDetailGuardState;
  onAttend: () => Promise<void>;
  onCancel: () => Promise<void>;
  onRequestApproval: () => Promise<void>;
  onViewMoreWorkshops: () => void;
}

export function WorkshopDetailsMainContent({
  workshop,
  isAdmin,
  guardState,
  onAttend,
  onCancel,
  onRequestApproval,
  onViewMoreWorkshops,
}: WorkshopDetailsMainContentProps) {
  return (
    <div className="lg:col-span-2 space-y-8">
      {workshop.image && (
        <div className="aspect-[16/7] w-full overflow-hidden rounded-lg bg-muted">
          <img src={workshop.image} alt={workshop.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-4xl font-bold leading-tight">{workshop.title}</h1>
      </div>

      <div className="pb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">About</h2>
        <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{workshop.description}</p>
      </div>

      {(workshop.materialsProvided || '').trim() && (
        <div className="pb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Materials Provided</h2>
          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
            {workshop.materialsProvided}
          </p>
        </div>
      )}

      {(workshop.materialsNeededFromClub || '').trim() && (
        <div className="pb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">
            Materials Needed From Club
          </h2>
          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
            {workshop.materialsNeededFromClub}
          </p>
        </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase">Participants</h2>
          <div className="space-y-4">
            <div className="flex items-center text-base">
              <Users className="w-5 h-5 mr-2 text-foreground" />
              <span>
                {workshop.currentParticipants ?? 0}
                {typeof workshop.maxParticipants === 'number' ? ` of ${workshop.maxParticipants}` : ''}
                {' '}attending
              </span>
            </div>

            {(workshop.participants?.length ?? 0) > 0 && (
              <div>
                <p className="text-sm text-foreground mb-3">Going:</p>
                <div className="flex flex-wrap gap-3">
                  {workshop.participants?.slice(0, 6).map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={participant.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {participant.username?.split(' ').map((name) => name[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{participant.username}</span>
                    </div>
                  ))}
                  {(workshop.participants?.length ?? 0) > 6 && (
                    <div className="flex items-center">
                      <Badge variant="outline">+{(workshop.participants?.length ?? 0) - 6}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <WorkshopDetailsActionPanel
        guardState={guardState}
        onAttend={onAttend}
        onCancel={onCancel}
        onRequestApproval={onRequestApproval}
        onViewMoreWorkshops={onViewMoreWorkshops}
      />
    </div>
  );
}
