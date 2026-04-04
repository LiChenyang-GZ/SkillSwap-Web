import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  isUserWorkshopUpcoming,
  isUserWorkshopVisible,
} from './workshop/workshopStatusPublicApi';

export function Dashboard() {
  const { user, workshops, setCurrentPage, cancelWorkshopAttendance } = useApp();

  // Early return if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  // Get user's attended workshops
  const attendedWorkshops = workshops.filter(w => 
    (w.participants ?? []).some(p => p.id === user.id)
  ).filter((w) => isUserWorkshopVisible(w));

  // Get user's hosted workshops
  const hostedWorkshops = workshops.filter(w => w.facilitator?.id === user.id).filter((w) => isUserWorkshopVisible(w));

  // Calculate stats  ?? better to store numbers in database and fetch 
  const upcomingAttended = attendedWorkshops.filter((w) => isUserWorkshopUpcoming(w)).length;
  const upcomingHosted = hostedWorkshops.filter((w) => isUserWorkshopUpcoming(w)).length;

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">
              Track your learning journey and workshop activities
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
                  <h2 className="text-xl font-semibold mb-1">{user.username}</h2>
                  <p className="text-muted-foreground text-sm mb-4">{user.email}</p>
                  
                  <div className="flex items-center justify-center space-x-1 mb-4">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{user.rating}</span>
                    <span className="text-muted-foreground text-sm">/5.0</span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full mb-4">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>

                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-4">{user.bio}</p>
                  )}

                  {/* Skills */}
                  <div className="text-left">
                    <h3 className="font-medium mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {user.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
                        <p className="text-sm text-muted-foreground">Upcoming</p>
                        <p className="text-xl font-bold">{upcomingAttended + upcomingHosted}</p>
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
                        <p className="text-xl font-bold">{user.totalWorkshopsAttended}</p>
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
                        <p className="text-sm text-muted-foreground">Hosted</p>
                        <p className="text-xl font-bold">{user.totalWorkshopsHosted}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="attending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attending">
                  Attending ({upcomingAttended})
                </TabsTrigger>
                <TabsTrigger value="hosting">
                  Hosting ({upcomingHosted})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attending" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workshops You're Attending</CardTitle>
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
                              {isUserWorkshopUpcoming(workshop) && (
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
                        <h3 className="font-semibold mb-2">No workshops yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Start attending workshops to build your skills
                        </p>
                        <Button onClick={() => setCurrentPage('explore')}>
                          Explore Workshops
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>


                    {/* Edit */}
              <TabsContent value="hosting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workshops You're Hosting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hostedWorkshops.length > 0 ? (
                      <div className="space-y-4">
                        {hostedWorkshops.map((workshop) => (
                          <div
                            key={workshop.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
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
                                {/* 积分系统已停用：隐藏 host 奖励展示。 */}
                                {/*
                                <Badge variant="outline" className="text-primary">
                                  <Award className="w-3 h-3 mr-1" />
                                  +{workshop.creditReward} credits
                                </Badge>
                                */}
                                <Badge variant="outline">Open Access</Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={getUserWorkshopStatusBadgeVariant(workshop)}
                              >
                                {getUserWorkshopStatusLabel(workshop) ?? 'Upcoming'}
                              </Badge>

                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No workshops hosted yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Share your expertise by hosting workshops
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
    </div>
  );
}