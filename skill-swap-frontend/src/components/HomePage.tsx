import { useApp } from '../contexts/AppContext';
import { Workshop } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  ArrowRight,
  Award,
  BookOpen,
  Target
} from 'lucide-react';
import { getWorkshopAccessLabel, isUserWorkshopUpcoming } from './workshop/workshopStatusPublicApi';

export function HomePage() {
  const { user, workshops, setCurrentPage } = useApp();
  // Home 首屏仅展示公开的即将开始 workshop，不依赖参与者明细。
  const upcomingWorkshops = workshops.filter((w) => isUserWorkshopUpcoming(w));

  const featuredWorkshops = upcomingWorkshops.slice(0, 3);

  const resolveLocationLabel = (workshop: Workshop) => {
    if (workshop.isOnline) {
      return 'Online';
    }

    const location = workshop.location;
    if (Array.isArray(location)) {
      const first = location.find((item) => typeof item === 'string' && item.trim().length > 0);
      return first || 'In-person';
    }

    if (typeof location === 'string' && location.trim().length > 0) {
      return location;
    }

    return 'In-person';
  };

  // Quick stats
  const stats = [
    {
      title: 'Upcoming Workshops',
      value: upcomingWorkshops.length,
      icon: Award,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Workshops Attended',
      value: user?.totalWorkshopsAttended ?? 0,
      icon: BookOpen,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Workshops Hosted',
      value: user?.totalWorkshopsHosted ?? 0,
      icon: Target,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="py-8 lg:py-12">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              Welcome back, {user?.username?.split(' ')[0] ?? 'Guest'}! 👋
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              Ready to learn something new or share your expertise? Discover workshops and grow your skills with our community.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg"
                onClick={() => setCurrentPage('explore')}
                className="flex items-center space-x-2"
              >
                <BookOpen className="w-5 h-5" />
                <span>Explore Workshops</span>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setCurrentPage('create')}
                className="flex items-center space-x-2"
              >
                <Target className="w-5 h-5" />
                <span>Host a Workshop</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Workshops */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Upcoming Workshops</h2>
              <Button 
                variant="ghost"
                onClick={() => setCurrentPage('dashboard')}
                className="flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>



            {/* Is upcoming event if not ... */}
            {upcomingWorkshops.length > 0 ? (
              <div className="space-y-4">

                {/* show up to three  Value: workshop[date, time, location, facilator[name] , category]*/}
                {upcomingWorkshops.slice(0, 3).map((workshop) => (
                  <Card key={workshop.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{workshop.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(workshop.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{workshop.time}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{resolveLocationLabel(workshop)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={workshop.facilitator?.avatarUrl} />
                              <AvatarFallback>{workshop.facilitator?.name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">{workshop.facilitator?.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge>{workshop.category}</Badge>
                          <Button size="sm" variant="outline" onClick={() => setCurrentPage(`workshop-${workshop.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No upcoming workshops</h3>
                  <p className="text-muted-foreground mb-4">
                    Explore our workshop catalog to find sessions that interest you.
                  </p>
                  <Button onClick={() => setCurrentPage('explore')}>
                    Browse Workshops
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Featured Workshops Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Featured Workshops</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCurrentPage('explore')}
                className="flex items-center space-x-1"
              >
                <TrendingUp className="w-4 h-4" />
                <span>See More</span>
              </Button>
              
            </div>
            {/* feature Workshop [workshop[id, image, title, date/time, facilitators[name, avatar]]] */}
            <div className="space-y-4">
              {featuredWorkshops.map((workshop) => (
                <Card
                  key={workshop.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                      {workshop.image && (
                        <img 
                          src={workshop.image} 
                          alt={workshop.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">{workshop.title}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(workshop.date).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getWorkshopAccessLabel(workshop)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={workshop.facilitator?.avatarUrl} />
                        <AvatarFallback className="text-xs">{workshop.facilitator?.name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{workshop.facilitator?.name}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}