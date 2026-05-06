import { Button } from '../../ui/button';
import type { WorkshopDetailGuardState } from '../models/workshopDetailViewModel';

interface WorkshopDetailsActionPanelProps {
  guardState: WorkshopDetailGuardState;
  onAttend: () => Promise<void>;
  onCancel: () => Promise<void>;
  onRequestApproval: () => Promise<void>;
  onViewMoreWorkshops: () => void;
}

export function WorkshopDetailsActionPanel({
  guardState,
  onAttend,
  onCancel,
  onRequestApproval,
  onViewMoreWorkshops,
}: WorkshopDetailsActionPanelProps) {
  return (
    <div className="mt-6">
      <div className="flex gap-4">
        <div className="flex-1">
          {guardState.isCancelled ? (
            <Button disabled variant="outline" className="w-full">
              Workshop Cancelled
            </Button>
          ) : guardState.isRejected ? (
            <Button disabled variant="outline" className="w-full">
              Workshop Rejected
            </Button>
          ) : guardState.isPending ? (
            <Button
              variant="outline"
              onClick={guardState.isHost ? () => void onRequestApproval() : undefined}
              disabled={!guardState.isHost}
              className="w-full"
            >
              {guardState.isHost ? 'Request Approval' : 'Pending Approval'}
            </Button>
          ) : guardState.isCompleted ? (
            <Button disabled variant="outline" className="w-full">
              Workshop Completed
            </Button>
          ) : guardState.isHost ? (
            <Button
              variant="secondary"
              disabled
              className="w-full bg-orange-500 text-white hover:bg-orange-500/90 disabled:opacity-100"
            >
              Hosted by Me
            </Button>
          ) : guardState.isUserAttending ? (
            guardState.isUpcoming ? (
              <Button onClick={() => void onCancel()} className="w-full" size="lg">
                Cancel Attendance
              </Button>
            ) : guardState.isOngoing ? (
              <Button disabled variant="outline" className="w-full">
                Workshop In Progress
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full">
                Workshop Completed
              </Button>
            )
          ) : guardState.isAttendClosedByCutoff ? (
            <Button disabled variant="outline" className="w-full">
              Attendance Closed
            </Button>
          ) : guardState.isOngoing ? (
            <Button disabled variant="outline" className="w-full">
              Workshop In Progress
            </Button>
          ) : guardState.isFull ? (
            <Button disabled variant="outline" className="w-full">
              Workshop Full
            </Button>
          ) : (
            <Button
              onClick={() => void onAttend()}
              className="w-full"
              size="lg"
              disabled={!guardState.isUpcoming || guardState.isAttendClosedByCutoff}
            >
              Attend Workshop
            </Button>
          )}
        </div>
        <div className="flex-1">
          <Button variant="outline" onClick={onViewMoreWorkshops} className="w-full gap-2">
            View More Workshops
          </Button>
        </div>
      </div>
    </div>
  );
}
