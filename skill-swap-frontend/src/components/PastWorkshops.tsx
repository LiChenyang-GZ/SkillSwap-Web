import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Search,
  Calendar,
  Users,
  Clock,
  MapPin,
  Globe,
  Archive,
} from 'lucide-react';
import { categories, skillLevels } from '../lib/mock-data';
import { Workshop } from '../types';

function isOldWorkshop(workshop: Workshop): boolean {
  const status = (workshop.status || '').toLowerCase();
  if (status === 'completed' || status === 'cancelled') return true;

  if (!workshop.date) return false;
  const time = workshop.time || '00:00';
  const dateTime = new Date(`${workshop.date}T${time}`);
  if (Number.isNaN(dateTime.getTime())) return false;

  return dateTime.getTime() < Date.now();
}

export function PastWorkshops() {
  const { workshops, user, setCurrentPage } = useApp();
  const normalizeStatus = (status?: string) => (status || 'pending').toLowerCase();
  const displayStatus = (status?: string) => {
    const normalized = normalizeStatus(status);
    return normalized === 'approved' ? 'upcoming' : normalized;
  };
  const statusBadgeVariant = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'rejected') return 'destructive';
    if (normalized === 'approved' || normalized === 'upcoming') return 'default';
    if (normalized === 'pending') return 'secondary';
    return 'outline';
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const filteredWorkshops = workshops
    .filter(isOldWorkshop)
    .filter((workshop) => {
      const matchesSearch = workshop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workshop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workshop.facilitator?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || workshop.category === selectedCategory;
      const matchesSkillLevel = selectedSkillLevel === 'all' || workshop.skillLevel === selectedSkillLevel;
      const matchesLocation = selectedLocation === 'all' ||
        (selectedLocation === 'online' && workshop.isOnline) ||
        (selectedLocation === 'in-person' && !workshop.isOnline);

      return matchesSearch && matchesCategory && matchesSkillLevel && matchesLocation;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const bTime = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return bTime - aTime;
    });

  const isUserAttending = (workshop: Workshop) =>
    (workshop.participants ?? []).some((p) => p.id === user?.id);

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Past Workshops</h1>
          <p className="text-lg text-muted-foreground">
            Browse previously held workshops and revisit what the community has shared.
          </p>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search archived workshops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Skill Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {skillLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation} modal={false}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredWorkshops.length} archived workshop{filteredWorkshops.length !== 1 ? 's' : ''}
          </p>
        </div>

        {filteredWorkshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkshops.map((workshop) => (
              <Card key={workshop.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-0">
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
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary">{workshop.category}</Badge>
                      <Badge variant={statusBadgeVariant(workshop.status)} className="capitalize">
                        {displayStatus(workshop.status)}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{workshop.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{workshop.description}</p>

                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={workshop.facilitator?.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {workshop.facilitator?.name?.split(' ').map((n) => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{workshop.facilitator?.name}</p>
                    </div>

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
                            <span className="line-clamp-1">{workshop.location}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{workshop.currentParticipants ?? 0}/{workshop.maxParticipants} participants</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setCurrentPage(`workshop-${workshop.id}`)}
                      >
                        View Details
                      </Button>
                      {isUserAttending(workshop) ? (
                        <Badge variant="secondary" className="px-3 py-1">Attended</Badge>
                      ) : (
                        <Badge variant="outline" className="px-3 py-1 flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Archived
                        </Badge>
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
              <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No past workshops found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters, or check back after upcoming workshops are completed.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedSkillLevel('all');
                  setSelectedLocation('all');
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
