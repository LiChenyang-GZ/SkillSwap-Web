import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Globe,
} from 'lucide-react';
import { categories } from '../../lib/mock-data';
import {
  getUserWorkshopStatusBadgeVariant,
  getUserWorkshopStatusLabel,
  isUserWorkshopUpcomingOrOngoing,
  resolveUserWorkshopStatus,
} from './workshopStatusPublicApi';

export function ExploreWorkshops() {
  const { workshops, user, attendWorkshop, setCurrentPage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter workshops based on search and category
  // Return only upcoming/ongoing workshops
  const filteredWorkshops = workshops.filter(workshop => {
    const matchesSearch = workshop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workshop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workshop.facilitator?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || workshop.category === selectedCategory;

    return matchesSearch && matchesCategory && isUserWorkshopUpcomingOrOngoing(workshop);
  });

  const isUserAttending = (workshopId: string) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop?.participants?.some(p => p.id === user?.id) || false;
  };

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Explore Workshops</h1>
          <p className="text-lg text-muted-foreground">
            Discover workshops from our community of experts and expand your skillset.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search workshops, skills, or facilitators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredWorkshops.length} workshop{filteredWorkshops.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Workshops Grid */}
        {filteredWorkshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkshops.map((workshop) => (
              <Card key={workshop.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
                  {/* Workshop Image */}
                  <div className="aspect-[4/3] bg-muted rounded-t-lg overflow-hidden">
                    {workshop.image && (
                      <img
                        src={workshop.image}
                        alt={workshop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                  </div>

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{workshop.category}</Badge>
                        <Badge variant={getUserWorkshopStatusBadgeVariant(workshop)}>
                          {getUserWorkshopStatusLabel(workshop) ?? 'Upcoming'}
                        </Badge>
                      </div>
                      <Badge variant="outline">Open Access</Badge>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{workshop.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {workshop.description}
                    </p>

                    {/* Facilitator */}
                    {/* <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={workshop.facilitator?.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {workshop.facilitator?.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{workshop.facilitator?.name}</p>
                      </div>
                    </div> */}

                    {/* Workshop Details */}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                      >
                        View Details
                      </Button>
                      {isUserAttending(workshop.id) ? (
                        <Badge variant="secondary" className="px-3 py-1">
                          Attending
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={resolveUserWorkshopStatus(workshop) === 'ongoing'}
                          onClick={() => attendWorkshop(workshop.id)}
                          className="shrink-0"
                        >
                          {resolveUserWorkshopStatus(workshop) === 'ongoing' ? 'In Progress' : 'Attend'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No workshops found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or filters to find workshops.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
