import { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { workshopAPI } from '../lib/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { Workshop } from '../types';
import { toast } from 'sonner';

interface WorkshopDetailsProps {
  workshopId: string;
}

export function WorkshopDetails({ workshopId }: WorkshopDetailsProps) {
  const { workshops, user, isAdmin, sessionToken, attendWorkshop, cancelWorkshopAttendance, setCurrentPage, upsertWorkshop } = useApp();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const found = workshops.find((w) => w.id === workshopId);
    if (found) {
      setWorkshop(found);
      setIsLoading(false);
    }
  }, [workshopId, workshops]);

  useEffect(() => {
    let isMounted = true;

    const loadWorkshop = async (force = false) => {
      if (!force && lastFetchedIdRef.current === workshopId) {
        return;
      }
      lastFetchedIdRef.current = workshopId;
      const hasLocalSnapshot = workshops.some((item) => item.id === workshopId);
      if (!hasLocalSnapshot) {
        setIsLoading(true);
      }
      try {
        const latest = await workshopAPI.getById(workshopId, sessionToken);
        if (latest && isMounted) {
          setWorkshop(latest);
          upsertWorkshop(latest);
        }
      } catch (error) {
        console.warn("Failed to refresh workshop details", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWorkshop();

    return () => {
      isMounted = false;
    };
  }, [workshopId, sessionToken, upsertWorkshop, workshops]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('explore')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">Workshop not found</h3>
            <p className="text-muted-foreground">
              The workshop you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isUserAttending = workshop.participants?.some((p) => p.id === user?.id) || false;
  const isFull = typeof workshop.maxParticipants === 'number'
    ? (workshop.currentParticipants ?? 0) >= workshop.maxParticipants
    : false;
  const normalizedStatus = (workshop.status || "").toLowerCase();
  const isCancelled = normalizedStatus === "cancelled";
  const isPending = normalizedStatus === "pending";
  const isRejected = normalizedStatus === "rejected";
  const isHost = workshop.facilitator?.id === user?.id;
  const canViewRestricted = isAdmin || isHost;
  // 积分系统已停用：不再根据余额限制报名。
  // const hasEnoughCredits = user && user.creditBalance >= workshop.creditCost;

  if ((isPending || isRejected) && !canViewRestricted) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('explore')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">Workshop not found</h3>
            <p className="text-muted-foreground">
              The workshop you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAttend = async () => {
    await attendWorkshop(workshopId);
  };

  const handleCancel = async () => {
    await cancelWorkshopAttendance(workshopId);
  };

  const handleRequestApproval = async () => {
    if (!sessionToken) {
      toast.error("Please sign in to request approval");
      return;
    }
    try {
      await workshopAPI.requestApproval(workshopId, sessionToken);
      toast.success("Approval request sent to admins");
    } catch (error) {
      console.error("Failed to request approval", error);
      toast.error("Failed to send approval request");
    }
  };


  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage('explore')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {workshop.image && (
              <div className="aspect-[16/7] w-full overflow-hidden rounded-lg bg-muted">
                <img src={workshop.image} alt={workshop.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold leading-tight">{workshop.title}</h1>
            </div>

            {/* About Section */}
            <div className="pb-8">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">About</h2>
              <p className="text-base leading-relaxed text-foreground">{workshop.description}</p>
            </div>

            {/* Materials Section */}
            {(workshop.materialsProvided || '').trim() && (
              <div className="pb-8">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Materials Provided</h2>
                <p className="text-base leading-relaxed text-foreground">{workshop.materialsProvided}</p>
              </div>
            )}

            {/* Club Materials Section */}
            {(workshop.materialsNeededFromClub || '').trim() && (
              <div className="pb-8">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Materials Needed From Club</h2>
                <p className="text-base leading-relaxed text-foreground">{workshop.materialsNeededFromClub}</p>
              </div>
            )}

            {isAdmin && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Participants</h2>
                <div className="space-y-4">
                  <div className="flex items-center text-base">
                    <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>
                      {workshop.currentParticipants ?? 0}
                      {typeof workshop.maxParticipants === 'number' ? ` of ${workshop.maxParticipants}` : ''}
                      {' '}attending
                    </span>
                  </div>

                  {(workshop.participants?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Going:</p>
                      <div className="flex flex-wrap gap-3">
                        {workshop.participants?.slice(0, 6).map((participant) => (
                          <div key={participant.id} className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={participant.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {participant.username?.split(' ').map((n) => n[0]).join('') || '?'}
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

            {/* Action Buttons */}
            <div className="mt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  {isCancelled ? (
                    <Button disabled variant="outline" className="w-full">
                      Workshop Cancelled
                    </Button>
                  ) : isRejected ? (
                    <Button disabled variant="outline" className="w-full">
                      Workshop Rejected
                    </Button>
                  ) : isPending ? (
                    <Button
                      variant="outline"
                      onClick={isHost ? handleRequestApproval : undefined}
                      disabled={!isHost}
                      className="w-full"
                    >
                      {isHost ? "Request Approval" : "Pending Approval"}
                    </Button>
                  ) : isUserAttending ? (
                    <Button variant="outline" onClick={handleCancel} className="w-full">
                      Cancel Attendance
                    </Button>
                  ) : isFull ? (
                    <Button disabled variant="outline" className="w-full">
                      Workshop Full
                    </Button>
                  ) : (
                    <Button onClick={handleAttend} className="w-full" size="lg">
                      Attend Workshop
                    </Button>
                  )}
                </div>
                <div className="flex-1">
                  <Button variant="outline" onClick={() => setCurrentPage('explore')} className="w-full gap-2">
                    View More Workshops
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: key info & tags (below image) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Key Info Card */}
              <div className="bg-muted rounded-lg p-6 space-y-6">
                {/* Access */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Access</p>
                  <span className="text-lg font-semibold">Open to all members</span>
                </div>

                {/* Date */}
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

                {/* Time */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Time</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-base">{workshop.time}</span>
                  </div>
                </div>

                {workshop.duration && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Duration</p>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="text-base">
                        {workshop.duration >= 60 && workshop.duration % 60 === 0
                          ? `${workshop.duration / 60} ${workshop.duration === 60 ? 'hour' : 'hours'}`
                          : `${workshop.duration} mins`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Location */}
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
                        <span className="text-base">
                          {typeof workshop.location === 'string' && workshop.location.trim()
                            ? workshop.location
                            : 'To be confirmed by admin'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
