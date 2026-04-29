import { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { workshopAPI } from '../lib/api';
import { 
  Calendar, 
  Users, 
  Star, 
  Clock,
  MapPin,
  BookOpen,
  Target,
  Globe,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  getWorkshopAccessLabel,
  getUserWorkshopStatusBadgeVariant,
  getUserWorkshopStatusLabel,
  isUserWorkshopVisible,
  normalizeAdminWorkshopStatus,
  resolveUserWorkshopStatus,
} from './workshop/workshopStatusPublicApi';

export function Dashboard() {
  const { user, workshops, sessionToken, setCurrentPage, cancelWorkshopAttendance, updateCurrentUserProfile, uploadCurrentUserAvatar } = useApp();
  const PAGE_SIZE = 8;
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [hiddenHostedWorkshopIds, setHiddenHostedWorkshopIds] = useState<string[]>([]);
  const [hidingWorkshopIds, setHidingWorkshopIds] = useState<string[]>([]);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [attendedPage, setAttendedPage] = useState(1);
  const [hostingPage, setHostingPage] = useState(1);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const statusBadgeClassName = 'h-7 min-w-[108px] justify-center text-xs';

  type HostingDisplayStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

  // Early return if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  const parseWorkshopStartTime = (workshop: (typeof workshops)[number]) => {
    const rawDate = String(workshop.date || '').trim();
    const rawTime = String(workshop.time || '').trim();

    if (!rawDate) {
      return null;
    }

    const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
    const timePart = rawTime ? (rawTime.length === 5 ? `${rawTime}:00` : rawTime) : '00:00:00';
    const parsed = new Date(`${datePart}T${timePart}`);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  };

  const resolveHostingDisplayStatus = (workshop: (typeof workshops)[number]): HostingDisplayStatus => {
    const adminStatus = normalizeAdminWorkshopStatus(workshop.status);

    if (adminStatus === 'pending' || adminStatus === 'rejected' || adminStatus === 'cancelled' || adminStatus === 'completed') {
      return adminStatus;
    }

    const start = parseWorkshopStartTime(workshop);
    if (!start) {
      return 'approved';
    }

    const durationMinutes = Number(workshop.duration);
    if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      if (new Date() >= end) {
        return 'completed';
      }
    }

    // For hosting list, active approved workshops remain "Approved" until they can be confidently marked completed.
    const now = new Date();
    const isSameCalendarDay =
      now.getFullYear() === start.getFullYear() &&
      now.getMonth() === start.getMonth() &&
      now.getDate() === start.getDate();

    if (now > start && !isSameCalendarDay && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
      return 'completed';
    }

    return 'approved';
  };

  const getHostingStatusMeta = (workshop: (typeof workshops)[number]) => {
    const status = resolveHostingDisplayStatus(workshop);

    if (status === 'pending') {
      return { label: 'Pending', variant: 'secondary' as const, removable: false };
    }
    if (status === 'approved') {
      return { label: 'Approved', variant: 'default' as const, removable: false };
    }
    if (status === 'rejected') {
      return { label: 'Rejected', variant: 'destructive' as const, removable: true };
    }
    if (status === 'cancelled') {
      return { label: 'Cancelled', variant: 'destructive' as const, removable: true };
    }

    return { label: 'Completed', variant: 'outline' as const, removable: false };
  };

  const dedupeWorkshopsById = (list: (typeof workshops)[number][]) => {
    const byId = new Map<string, (typeof workshops)[number]>();
    list.forEach((workshop) => byId.set(workshop.id, workshop));
    return Array.from(byId.values());
  };

  const getWorkshopStartMillis = (workshop: (typeof workshops)[number]) => {
    const start = parseWorkshopStartTime(workshop);
    return start ? start.getTime() : Number.MAX_SAFE_INTEGER;
  };

  const sortByStartAsc = (list: (typeof workshops)[number][]) => {
    return [...list].sort((a, b) => getWorkshopStartMillis(a) - getWorkshopStartMillis(b));
  };

  const sortByStartDesc = (list: (typeof workshops)[number][]) => {
    return [...list].sort((a, b) => getWorkshopStartMillis(b) - getWorkshopStartMillis(a));
  };

  const totalPages = (count: number) => Math.max(1, Math.ceil(count / PAGE_SIZE));

  const paginate = (list: (typeof workshops)[number][], page: number) => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return list.slice(startIndex, startIndex + PAGE_SIZE);
  };

  const isHostedByCurrentUser = (workshop: (typeof workshops)[number]) => {
    return Boolean(workshop.facilitator?.id && String(workshop.facilitator.id) === String(user.id));
  };

  const participantWorkshops = workshops
    .filter((w) => !isHostedByCurrentUser(w))
    .filter((w) => isUserWorkshopVisible(w));

  const participantUpcomingWorkshops = participantWorkshops.filter((w) => {
    const status = resolveUserWorkshopStatus(w);
    return status === 'upcoming' || status === 'ongoing';
  });

  const participantAttendedWorkshops = participantWorkshops.filter(
    (w) => resolveUserWorkshopStatus(w) === 'completed'
  );

  const allHostedWorkshops = workshops.filter(isHostedByCurrentUser);
  const hostedUpcomingWorkshops = allHostedWorkshops.filter((w) => {
    const status = resolveHostingDisplayStatus(w);
    return status === 'approved';
  });
  const hostedAttendedWorkshops = allHostedWorkshops.filter(
    (w) => resolveHostingDisplayStatus(w) === 'completed'
  );

  const upcomingWorkshops = dedupeWorkshopsById([
    ...participantUpcomingWorkshops,
    ...hostedUpcomingWorkshops,
  ]);

  const attendedWorkshops = dedupeWorkshopsById([
    ...participantAttendedWorkshops,
    ...hostedAttendedWorkshops,
  ]);

  const hostingWorkshops = allHostedWorkshops.filter(
    (w) => !Boolean(w.hiddenByHost) && !hiddenHostedWorkshopIds.includes(w.id)
  );

  const sortedUpcomingWorkshops = sortByStartAsc(upcomingWorkshops);
  const sortedAttendedWorkshops = sortByStartDesc(attendedWorkshops);
  const sortedHostingWorkshops = sortByStartDesc(hostingWorkshops);

  const upcomingTotalPages = totalPages(sortedUpcomingWorkshops.length);
  const attendedTotalPages = totalPages(sortedAttendedWorkshops.length);
  const hostingTotalPages = totalPages(sortedHostingWorkshops.length);

  const pagedUpcomingWorkshops = paginate(sortedUpcomingWorkshops, upcomingPage);
  const pagedAttendedWorkshops = paginate(sortedAttendedWorkshops, attendedPage);
  const pagedHostingWorkshops = paginate(sortedHostingWorkshops, hostingPage);

  const hideHostedWorkshopFromView = async (workshopId: string) => {
    if (!sessionToken) {
      toast.error('Please sign in again to update your dashboard.');
      return;
    }

    setHidingWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
    try {
      await workshopAPI.hideHostingWorkshop(workshopId, sessionToken);
      setHiddenHostedWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
      toast.success('Removed from hosting list.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove workshop.';
      toast.error(message);
    } finally {
      setHidingWorkshopIds((prev) => prev.filter((id) => id !== workshopId));
    }
  };

  const handleWorkshopCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, workshopId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCurrentPage(`workshop-${workshopId}`);
    }
  };

  const renderPagination = (
    currentPage: number,
    pageCount: number,
    onPageChange: (page: number) => void
  ) => {
    if (pageCount <= 1) {
      return null;
    }

    return (
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };

  useEffect(() => {
    setEditUsername(user.username);
  }, [user.username]);

  useEffect(() => {
    const currentHostingIds = new Set(allHostedWorkshops.map((workshop) => workshop.id));
    setHiddenHostedWorkshopIds((prev) => {
      const next = prev.filter((id) => currentHostingIds.has(id));
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      return unchanged ? prev : next;
    });
  }, [allHostedWorkshops]);

  useEffect(() => {
    setUpcomingPage((page) => Math.min(page, upcomingTotalPages));
  }, [upcomingTotalPages]);

  useEffect(() => {
    setAttendedPage((page) => Math.min(page, attendedTotalPages));
  }, [attendedTotalPages]);

  useEffect(() => {
    setHostingPage((page) => Math.min(page, hostingTotalPages));
  }, [hostingTotalPages]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  const resetEditProfileDraft = () => {
    setProfileError(null);
    setEditUsername(user.username);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const handleEditProfileOpenChange = (open: boolean) => {
    if (!open) {
      resetEditProfileDraft();
    }
    setIsEditProfileOpen(open);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUsername = editUsername.trim();

    if (!nextUsername) {
      setProfileError('Name cannot be empty.');
      return;
    }

    const hasNameChange = nextUsername !== user.username.trim();
    const hasAvatarChange = pendingAvatarFile !== null;

    if (!hasNameChange && !hasAvatarChange) {
      setIsEditProfileOpen(false);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (hasNameChange) {
        await updateCurrentUserProfile({ username: nextUsername });
      }
      if (pendingAvatarFile) {
        await uploadCurrentUserAvatar(pendingAvatarFile);
      }
      toast.success('Profile updated successfully.');
      resetEditProfileDraft();
      setIsEditProfileOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      setProfileError(message);
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    const supportedImageTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ]);
    const contentType = String(file.type || '').toLowerCase();
    if (!supportedImageTypes.has(contentType)) {
      const message = 'Unsupported image format. Please use PNG/JPG/WEBP/GIF/SVG.';
      setProfileError(message);
      toast.error(message);
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      const message = 'Image size must be 10MB or smaller.';
      setProfileError(message);
      toast.error(message);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfileError(null);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return previewUrl;
    });
  };

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">
              👋 Welcome back, {user.username.split(' ')[0] || 'Member'}! Track your learning journey and workshop activities.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
            <Button onClick={() => setCurrentPage('create')} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Target className="w-4 h-4 mr-2" />
              Host a Workshop
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage key={user.avatarUrl || 'empty-avatar'} src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback className="text-lg">
                      {user.username.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mb-4 break-words">{user.username}</h2>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-4"
                    onClick={() => {
                      resetEditProfileDraft();
                      setIsEditProfileOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>
                  )}

                  {/* Skills */}
                  {/* <div className="text-left">
                    <h3 className="font-medium mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {user.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div> */}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* 积分系统已停用：原图标为 CreditCard。 */}
                      {/*
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      */}
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">My Upcoming Workshops</p>
                        <p className="text-xl font-bold">{upcomingWorkshops.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Attended</p>
                        <p className="text-xl font-bold">{attendedWorkshops.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hosting Workshops</p>
                        <p className="text-xl font-bold">{hostingWorkshops.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">
                  My Upcoming ({upcomingWorkshops.length})
                </TabsTrigger>
                <TabsTrigger value="attended">
                  Attended ({attendedWorkshops.length})
                </TabsTrigger>
                <TabsTrigger value="hosting">
                  Hosting ({hostingWorkshops.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
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
                            onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
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
                                  <AvatarImage src={workshop.facilitator?.avatarUrl} />
                                  <AvatarFallback className="text-xs">
                                    {workshop.facilitator?.name?.split(' ').map(n => n[0]).join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{workshop.facilitator?.name}</span>
                                <Badge variant="secondary">{workshop.category}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={getUserWorkshopStatusBadgeVariant(workshop)}
                                className={statusBadgeClassName}
                              >
                                {getUserWorkshopStatusLabel(workshop) ?? 'Upcoming'}
                              </Badge>
                              {resolveUserWorkshopStatus(workshop) === 'upcoming' && !isHostedByCurrentUser(workshop) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void cancelWorkshopAttendance(workshop.id);
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {renderPagination(upcomingPage, upcomingTotalPages, setUpcomingPage)}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No upcoming workshops</h3>
                        <p className="text-muted-foreground mb-4">
                          Explore workshops and join sessions you want to attend.
                        </p>
                        <Button onClick={() => setCurrentPage('explore')}>
                          Explore Workshops
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attended" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Attended Workshops</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendedWorkshops.length > 0 ? (
                      <div className="space-y-4">
                        {pagedAttendedWorkshops.map((workshop) => (
                          <div
                            key={workshop.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
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
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge variant="secondary">{workshop.category}</Badge>
                              </div>
                            </div>
                            <Badge variant="outline" className={statusBadgeClassName}>Completed</Badge>
                          </div>
                        ))}
                        {renderPagination(attendedPage, attendedTotalPages, setAttendedPage)}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No attended workshops yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Workshops you have completed will appear here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>


                    {/* Edit */}
              <TabsContent value="hosting" className="space-y-4">
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
                              onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
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
                                    <span>{workshop.currentParticipants}/{workshop.maxParticipants}</span>
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
                                      void hideHostedWorkshopFromView(workshop.id);
                                    }}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                  <Badge
                                    variant={statusMeta.variant}
                                    className={statusBadgeClassName}
                                  >
                                    {statusMeta.label}
                                  </Badge>
                              </div>
                            </div>
                          );
                        })}
                        {renderPagination(hostingPage, hostingTotalPages, setHostingPage)}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No hosting workshops to show</h3>
                        <p className="text-muted-foreground mb-4">
                          Host a workshop, or remove rejected/cancelled items from this list.
                        </p>
                        <Button onClick={() => setCurrentPage('create')} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                          Host a Workshop
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={isEditProfileOpen} onOpenChange={handleEditProfileOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    key={(pendingAvatarPreviewUrl ?? user.avatarUrl) || 'empty-avatar-edit'}
                    src={pendingAvatarPreviewUrl ?? user.avatarUrl}
                    alt={user.username}
                  />
                  <AvatarFallback>
                    {user.username.split(' ').map((n) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingProfile}
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    Choose Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG/JPG/WEBP, up to 10MB.</p>
                  {pendingAvatarFile && (
                    <p className="text-xs text-foreground mt-1">Selected: {pendingAvatarFile.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-profile-name">Name</Label>
              <Input
                id="dashboard-profile-name"
                value={editUsername}
                onChange={(event) => setEditUsername(event.target.value)}
                maxLength={80}
                placeholder="Enter your display name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-profile-email">Email</Label>
              <Input
                id="dashboard-profile-email"
                value={user.email}
                readOnly
                disabled
              />
            </div>

            {profileError && (
              <p className="text-sm text-destructive">{profileError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditProfileOpenChange(false)}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}