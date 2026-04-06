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
import { 
  Calendar, 
  Users, 
  Star, 
  Clock,
  MapPin,
  BookOpen,
  Target,
  Globe,
  Edit
} from 'lucide-react';
import {
  getUserWorkshopStatusBadgeVariant,
  getUserWorkshopStatusLabel,
  isUserWorkshopVisible,
  normalizeAdminWorkshopStatus,
  resolveUserWorkshopStatus,
} from './workshop/workshopStatusPublicApi';

export function Dashboard() {
  const { user, workshops, setCurrentPage, cancelWorkshopAttendance, updateCurrentUserProfile, uploadCurrentUserAvatar } = useApp();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [hiddenHostedWorkshopIds, setHiddenHostedWorkshopIds] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  // Early return if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  const normalizedUsername = user.username.trim().toLowerCase();
  const normalizedEmail = user.email.trim().toLowerCase();
  const isHostedByCurrentUser = (workshop: (typeof workshops)[number]) => {
    const facilitatorId = workshop.facilitator?.id ? String(workshop.facilitator.id) : null;
    if (facilitatorId && facilitatorId === String(user.id)) {
      return true;
    }

    const submitterEmail = String(workshop.submitterEmail || '').trim().toLowerCase();
    if (submitterEmail && normalizedEmail && submitterEmail === normalizedEmail) {
      return true;
    }

    const submitterName = String(workshop.submitterUsername || workshop.hostName || workshop.facilitator?.name || '')
      .trim()
      .toLowerCase();
    return Boolean(submitterName && normalizedUsername && submitterName === normalizedUsername);
  };

  const participantWorkshops = workshops
    .filter((w) => (w.participants ?? []).some((p) => p.id === user.id))
    .filter((w) => isUserWorkshopVisible(w));

  const upcomingWorkshops = participantWorkshops.filter((w) => {
    const status = resolveUserWorkshopStatus(w);
    return status === 'upcoming' || status === 'ongoing';
  });

  const attendedWorkshops = participantWorkshops.filter(
    (w) => resolveUserWorkshopStatus(w) === 'completed'
  );

  const allHostedWorkshops = workshops.filter(isHostedByCurrentUser);
  const hostingWorkshops = allHostedWorkshops.filter(
    (w) => !hiddenHostedWorkshopIds.includes(w.id)
  );

  const removeHostedWorkshopFromView = (workshopId: string) => {
    setHiddenHostedWorkshopIds((prev) => (prev.includes(workshopId) ? prev : [...prev, workshopId]));
  };

  useEffect(() => {
    setEditUsername(user.username);
  }, [user.username]);

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

    if (!file.type.startsWith('image/')) {
      const message = 'Only image files are supported.';
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
            <Button onClick={() => setCurrentPage('create')}>
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
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback className="text-lg">
                      {user.username.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mb-4 break-words">{user.username}</h2>
                  
                  <div className="flex items-center justify-center space-x-1 mb-4">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{user.rating}</span>
                    <span className="text-muted-foreground text-sm">/5.0</span>
                  </div>

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
                        {upcomingWorkshops.map((workshop) => (
                          <div key={workshop.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
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
                              >
                                {getUserWorkshopStatusLabel(workshop) ?? 'Upcoming'}
                              </Badge>
                              {resolveUserWorkshopStatus(workshop) === 'upcoming' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => cancelWorkshopAttendance(workshop.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
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
                        {attendedWorkshops.map((workshop) => (
                          <div key={workshop.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
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
                            <Badge variant="outline">Completed</Badge>
                          </div>
                        ))}
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
                        {hostingWorkshops.map((workshop) => {
                          const adminStatus = normalizeAdminWorkshopStatus(workshop.status);
                          const removable = adminStatus === 'rejected' || adminStatus === 'cancelled';
                          const statusLabel =
                            adminStatus === 'rejected'
                              ? 'Rejected'
                              : adminStatus === 'cancelled'
                              ? 'Cancelled'
                              : getUserWorkshopStatusLabel(workshop) ?? 'Upcoming';

                          return (
                            <div
                              key={workshop.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setCurrentPage(`workshop-${workshop.id}`);
                                }
                              }}
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
                                  <Badge variant="outline">Open Access</Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={
                                    removable
                                      ? 'destructive'
                                      : getUserWorkshopStatusBadgeVariant(workshop)
                                  }
                                >
                                  {statusLabel}
                                </Badge>
                                {removable && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      removeHostedWorkshopFromView(workshop.id);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No hosting workshops to show</h3>
                        <p className="text-muted-foreground mb-4">
                          Host a workshop, or remove rejected/cancelled items from this list.
                        </p>
                        <Button onClick={() => setCurrentPage('create')}>
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
                  <AvatarImage src={pendingAvatarPreviewUrl ?? user.avatarUrl} alt={user.username} />
                  <AvatarFallback>
                    {user.username.split(' ').map((n) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
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