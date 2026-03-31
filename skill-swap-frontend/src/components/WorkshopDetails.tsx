import { useState, useEffect } from 'react';
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

interface WorkshopDetailsProps {
  workshopId: string;
}

export function WorkshopDetails({ workshopId }: WorkshopDetailsProps) {
  const { workshops, user, attendWorkshop, cancelWorkshopAttendance, setCurrentPage, upsertWorkshop } = useApp();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadWorkshop = async () => {
      setIsLoading(true);

      const found = workshops.find((w) => w.id === workshopId);
      if (found && isMounted) {
        setWorkshop(found);
      }

      try {
        const latest = await workshopAPI.getById(workshopId);
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
  }, [workshopId, workshops]);

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
  const isFull = (workshop.currentParticipants ?? 0) >= workshop.maxParticipants;
  const isCancelled = (workshop.status || "").toLowerCase() === "cancelled";
  // 积分系统已停用：不再根据余额限制报名。
  // const hasEnoughCredits = user && user.creditBalance >= workshop.creditCost;

  const handleAttend = async () => {
    await attendWorkshop(workshopId);
  };

  const handleCancel = async () => {
    await cancelWorkshopAttendance(workshopId);
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

        {/* Top layout handled inside the grid: title/facilitator (left) + image/key-info (right) */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 ">
          {/* Header row: title + facilitator (left) and image (right) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="mb-4 lg:mb-6">
              <h1 className="text-4xl font-bold leading-tight mb-8">{workshop.title}</h1>
              <p className="text-sm font-semibold text-muted-foreground mb-8 uppercase">Hosted By</p>
              <div className="flex items-center mt-2">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={workshop.facilitator?.avatarUrl} />
                  <AvatarFallback className="text-lg">
                    {workshop.facilitator?.name?.split(' ').map((n) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-6">
                  <p className="font-semibold text-lg">{workshop.facilitator?.name}</p>
                  {workshop.facilitator?.bio && (
                    <p className="text-sm text-muted-foreground mt-1">{workshop.facilitator?.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header right: image aligned with title/facilitator */}
          <div className="lg:col-span-1">
            {workshop.image && (
              <div className="aspect-video w-full h-full overflow-hidden rounded-lg bg-muted">
                <img src={workshop.image} alt={workshop.title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Content row: main details (left) */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="pb-8">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">About</h2>
              <p className="text-base leading-relaxed text-foreground">{workshop.description}</p>
            </div>

            {/* Materials Section */}
            {(workshop.materials?.length ?? 0) > 0 && (
              <div className="pb-8">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">What to Bring</h2>
                <ul className="space-y-2">
                  {workshop.materials?.map((material, idx) => (
                    <li key={idx} className="text-base text-foreground flex items-start">
                      <span className="mr-3">•</span>
                      <span>{material}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements Section */}
            {(workshop.requirements?.length ?? 0) > 0 && (
              <div className="pb-8">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Requirements</h2>
                <ul className="space-y-2">
                  {workshop.requirements?.map((req, idx) => (
                    <li key={idx} className="text-base text-foreground flex items-start">
                      <span className="mr-3">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Participants Section */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase">Participants</h2>
              <div className="space-y-4">
                <div className="flex items-center text-base">
                  <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                  <span>{workshop.currentParticipants ?? 0} of {workshop.maxParticipants} attending</span>
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

              {/* Action Buttons (under Participants) */}
              <div className="mt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    {isCancelled ? (
                      <Button disabled variant="outline" className="w-full">
                        Workshop Cancelled
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
          </div>

          {/* Right sidebar: key info & tags (below image) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Key Info Card */}
              <div className="bg-muted rounded-lg p-6 space-y-6">
                {/* Skill Level */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Skill Level</p>
                  <Badge variant="outline" className="text-base">{workshop.skillLevel}</Badge>
                </div>

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
                  {workshop.duration && (
                    <p className="text-xs text-muted-foreground mt-1">{workshop.duration} hours</p>
                  )}
                </div>

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
                        <span className="text-base">{workshop.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {(workshop.tags?.length ?? 0) > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {workshop.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
