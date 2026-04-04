import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { workshopAPI } from '../lib/api';
import { Workshop } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Calendar, Check, Clock, Globe, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { categories } from '../lib/mock-data';
import { toast } from 'sonner';
import type { WorkshopUpsertPayload } from '../lib/api';

interface WorkshopFormState {
  hostName: string;
  title: string;
  description: string;
  category: string;
  contactNumber: string;
  duration: string;
  maxParticipants: string;
  date: string;
  time: string;
  location: string;
  isOnline: boolean;
  materialsProvided: string;
  materialsNeededFromClub: string;
  venueRequirements: string;
  otherImportantInfo: string;
  detailsConfirmed: boolean;
}

const emptyForm: WorkshopFormState = {
  hostName: '',
  title: '',
  description: '',
  category: '',
  contactNumber: '',
  duration: '',
  maxParticipants: '',
  date: '',
  time: '',
  location: '',
  isOnline: false,
  materialsProvided: '',
  materialsNeededFromClub: '',
  venueRequirements: '',
  otherImportantInfo: '',
  detailsConfirmed: false,
};

export function AdminReview() {
  const { sessionToken, setCurrentPage } = useApp();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkshopFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadedDetailIds, setLoadedDetailIds] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [currentPage, setCurrentPageState] = useState(1);
  const [targetWorkshopId, setTargetWorkshopId] = useState<string | null>(() => {
    const storedTarget = sessionStorage.getItem('adminReviewTargetId');
    if (storedTarget) {
      sessionStorage.removeItem('adminReviewTargetId');
      return storedTarget;
    }
    return null;
  });
  const detailInFlightRef = useRef<Set<string>>(new Set());
  const pageSize = 8;

  const buildFormState = (workshop: Workshop): WorkshopFormState => {
    const locationValue = Array.isArray(workshop.location)
      ? workshop.location[0] || ''
      : workshop.location || '';

    return {
      hostName: workshop.hostName || '',
      title: workshop.title || '',
      description: workshop.description || '',
      category: workshop.category || '',
      contactNumber: workshop.contactNumber || '',
      duration: workshop.duration ? String(workshop.duration) : '',
      maxParticipants: workshop.maxParticipants ? String(workshop.maxParticipants) : '',
      date: workshop.date || '',
      time: workshop.time || '',
      location: workshop.isOnline ? '' : locationValue,
      isOnline: !!workshop.isOnline,
      materialsProvided: workshop.materialsProvided || '',
      materialsNeededFromClub: workshop.materialsNeededFromClub || '',
      venueRequirements: workshop.venueRequirements || '',
      otherImportantInfo: workshop.otherImportantInfo || '',
      detailsConfirmed: !!workshop.detailsConfirmed,
    };
  };

  const normalizeFormState = (state: WorkshopFormState): WorkshopFormState => ({
    ...state,
    title: state.title.trim(),
    description: state.description.trim(),
    category: state.category.trim(),
    hostName: state.hostName.trim(),
    contactNumber: state.contactNumber.trim(),
    duration: state.duration.trim(),
    maxParticipants: state.maxParticipants.trim(),
    date: state.date.trim(),
    time: state.time.trim(),
    location: state.location.trim(),
    materialsProvided: state.materialsProvided.trim(),
    materialsNeededFromClub: state.materialsNeededFromClub.trim(),
    venueRequirements: state.venueRequirements.trim(),
    otherImportantInfo: state.otherImportantInfo.trim(),
    detailsConfirmed: state.detailsConfirmed,
  });

  const filteredWorkshops = useMemo(() => {
    if (statusFilter === 'all') return workshops;
    return workshops.filter((workshop) => (workshop.status || '').toLowerCase() === statusFilter);
  }, [workshops, statusFilter]);

  const sortedWorkshops = useMemo(() => {
    const list = [...filteredWorkshops];
    list.sort((a, b) => {
      const aTime = new Date(`${a.date || '0000-01-01'}T${a.time || '00:00'}`).getTime();
      const bTime = new Date(`${b.date || '0000-01-01'}T${b.time || '00:00'}`).getTime();
      return bTime - aTime;
    });
    return list;
  }, [filteredWorkshops]);

  const totalPages = Math.max(1, Math.ceil(sortedWorkshops.length / pageSize));
  const pagedWorkshops = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedWorkshops.slice(start, start + pageSize);
  }, [sortedWorkshops, currentPage]);

  const selectedWorkshop = useMemo(
    () => sortedWorkshops.find((w) => w.id === selectedId) || null,
    [sortedWorkshops, selectedId]
  );
  const selectedHasDetail = selectedWorkshop ? !!loadedDetailIds[selectedWorkshop.id] : false;

  const isDirty = useMemo(() => {
    if (!selectedWorkshop) return false;
    const baseline = normalizeFormState(buildFormState(selectedWorkshop));
    const current = normalizeFormState(formData);
    return JSON.stringify(baseline) !== JSON.stringify(current);
  }, [formData, selectedWorkshop]);

  const loadWorkshopDetail = async (workshopId: string, force = false) => {
    if (!sessionToken || !workshopId) return;
    if (!force && loadedDetailIds[workshopId]) return;
    if (detailInFlightRef.current.has(workshopId)) return;

    detailInFlightRef.current.add(workshopId);

    setIsDetailLoading(true);
    try {
      const detail = await workshopAPI.getById(workshopId, sessionToken);
      if (!detail) return;

      setWorkshops((prev) => prev.map((w) => (w.id === detail.id ? { ...w, ...detail } : w)));
      setLoadedDetailIds((prev) => ({ ...prev, [workshopId]: true }));
    } catch (error) {
      console.error('Failed to load workshop details:', error);
      toast.error('Failed to load workshop details.');
    } finally {
      detailInFlightRef.current.delete(workshopId);
      setIsDetailLoading(false);
    }
  };

  const loadWorkshops = async (mode: 'pending' | 'all') => {
    if (!sessionToken) {
      setErrorMessage('Please sign in to review workshops.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data =
        mode === 'pending'
          ? await workshopAPI.getPendingForAdmin(sessionToken)
          : await workshopAPI.getAllForAdmin(sessionToken);

      setLoadedDetailIds({});
      setWorkshops(data);

      if (data.length > 0) {
        const fallbackId = data[0].id;
        const nextSelectedId = targetWorkshopId && data.some((w) => w.id === targetWorkshopId)
          ? targetWorkshopId
          : selectedId && data.some((w) => w.id === selectedId)
            ? selectedId
            : fallbackId;
        setSelectedId(nextSelectedId);
      } else {
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Failed to load admin workshops:', error);
      setErrorMessage('Admin access required or failed to load workshops.');
      setWorkshops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const mode = statusFilter === 'pending' ? 'pending' : 'all';
    void loadWorkshops(mode);
  }, [sessionToken, statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    void loadWorkshopDetail(selectedId);
  }, [selectedId, sessionToken]);

  useEffect(() => {
    if (sortedWorkshops.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillExists = sortedWorkshops.some((w) => w.id === selectedId);
    if (!stillExists) {
      setSelectedId(sortedWorkshops[0].id);
    }
  }, [sortedWorkshops, selectedId]);

  useEffect(() => {
    setCurrentPageState(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!targetWorkshopId || sortedWorkshops.length === 0) {
      return;
    }

    const targetIndex = sortedWorkshops.findIndex((w) => w.id === targetWorkshopId);
    if (targetIndex === -1) {
      return;
    }

    setSelectedId(targetWorkshopId);
    setCurrentPageState(Math.floor(targetIndex / pageSize) + 1);
    setTargetWorkshopId(null);

    requestAnimationFrame(() => {
      const targetElement = document.querySelector(`[data-workshop-id="${targetWorkshopId}"]`);
      if (targetElement instanceof HTMLElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [sortedWorkshops, targetWorkshopId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPageState(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedWorkshop) {
      setFormData(emptyForm);
      return;
    }

    setFormData(buildFormState(selectedWorkshop));
    setRejectComment('');
  }, [selectedWorkshop]);

  const handleInputChange = (field: keyof WorkshopFormState, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      const payload: WorkshopUpsertPayload = {
        hostName: formData.hostName,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        contactNumber: formData.contactNumber,
        duration: formData.duration ? parseInt(formData.duration, 10) : 0,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants, 10) : null,
        date: formData.date,
        time: formData.time,
        isOnline: formData.isOnline,
        location: formData.isOnline ? 'Online' : formData.location,
        materialsProvided: formData.materialsProvided,
        materialsNeededFromClub: formData.materialsNeededFromClub,
        venueRequirements: formData.venueRequirements,
        otherImportantInfo: formData.otherImportantInfo,
        detailsConfirmed: formData.detailsConfirmed,
      };

      const updated = await workshopAPI.updatePendingByAdmin(selectedWorkshop.id, payload, sessionToken);
      setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success('Workshop updated successfully.');
    } catch (error) {
      console.error('Failed to update workshop:', error);
      toast.error('Failed to update workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await workshopAPI.approveByAdmin(selectedWorkshop.id, sessionToken);
      toast.success('Workshop approved.');
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === selectedWorkshop.id
            ? {
                ...w,
                status: 'approved',
              }
            : w
        )
      );
      setTimeout(() => {
        const mode = statusFilter === 'pending' ? 'pending' : 'all';
        void loadWorkshops(mode);
      }, 0);
    } catch (error) {
      console.error('Failed to approve workshop:', error);
      toast.error('Failed to approve workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await workshopAPI.rejectByAdmin(selectedWorkshop.id, rejectComment || undefined, sessionToken);
      toast.success('Workshop rejected.');
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === selectedWorkshop.id
            ? {
                ...w,
                status: 'rejected',
              }
            : w
        )
      );
      setTimeout(() => {
        const mode = statusFilter === 'pending' ? 'pending' : 'all';
        void loadWorkshops(mode);
      }, 0);
    } catch (error) {
      console.error('Failed to reject workshop:', error);
      toast.error('Failed to reject workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedWorkshop || !selectedHasDetail || !sessionToken) return;
    setIsSaving(true);

    try {
      await workshopAPI.cancelByAdmin(selectedWorkshop.id, sessionToken);
      toast.success('Workshop cancelled.');
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === selectedWorkshop.id
            ? {
                ...w,
                status: 'cancelled',
              }
            : w
        )
      );
      setTimeout(() => {
        const mode = statusFilter === 'pending' ? 'pending' : 'all';
        void loadWorkshops(mode);
      }, 0);
    } catch (error) {
      console.error('Failed to cancel workshop:', error);
      toast.error('Failed to cancel workshop.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please sign in to review workshop submissions.</p>
          <Button className="mt-4" onClick={() => setCurrentPage('auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workshop Administration</h1>
            <p className="text-muted-foreground">Review, edit, approve, or cancel workshops before they start.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter} modal={false}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                const mode = statusFilter === 'pending' ? 'pending' : 'all';
                void loadWorkshops(mode);
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {errorMessage && (
          <Card className="mb-6">
            <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Workshops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && sortedWorkshops.length === 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading workshop submissions...
                  </div>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="border rounded-lg p-3 animate-pulse">
                      <div className="h-4 w-2/3 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/3 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : sortedWorkshops.length === 0 && !isLoading ? (
                <div className="text-sm text-muted-foreground">No workshops match this filter.</div>
              ) : (
                pagedWorkshops.map((workshop) => (
                  <button
                    key={workshop.id}
                    onClick={() => setSelectedId(workshop.id)}
                    data-workshop-id={workshop.id}
                    className={`w-full text-left border rounded-lg p-3 transition ${
                      selectedId === workshop.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium line-clamp-1">{workshop.title}</p>
                        <p className="text-xs text-muted-foreground">{workshop.facilitator?.name}</p>
                      </div>
                      <Badge
                        variant={(workshop.status || '').toLowerCase() === 'rejected' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {workshop.status || 'pending'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{workshop.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{workshop.time}</span>
                    </div>
                  </button>
                ))
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageState((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageState((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent>
              {(isLoading || isDetailLoading) && !selectedWorkshop ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading submission details...
                </div>
              ) : !selectedWorkshop ? (
                <div className="text-sm text-muted-foreground">Select a submission to review.</div>
              ) : !selectedHasDetail ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading detailed submission...
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const normalizedStatus = (selectedWorkshop.status || '').toLowerCase();
                    const dateValue = selectedWorkshop.date;
                    const timeValue = selectedWorkshop.time || '00:00';
                    const dateTime = dateValue ? new Date(`${dateValue}T${timeValue}`) : null;
                    const hasStarted = dateTime ? dateTime.getTime() <= Date.now() : false;
                    const canApprove = normalizedStatus === 'pending' && !hasStarted;
                    const canReject = normalizedStatus === 'pending' && !hasStarted;
                    const canEdit = !hasStarted && !['completed', 'cancelled'].includes(normalizedStatus);
                    const canCancel = !hasStarted && ['approved', 'upcoming'].includes(normalizedStatus);

                    return (
                      <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hostName">Host Name</Label>
                      <Input
                        id="hostName"
                        value={formData.hostName}
                        onChange={(e) => handleInputChange('hostName', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Workshop Name / Skill Taught</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value: string) => handleInputChange('category', value)} modal={false}>
                        <SelectTrigger className="mt-1" disabled={!canEdit}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="mt-1"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="mt-1"
                        disabled={formData.isOnline || !canEdit}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        {formData.isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                        <span>{formData.isOnline ? 'Online workshop' : 'In-person workshop'}</span>
                      </div>
                      <Switch
                        checked={formData.isOnline}
                        onCheckedChange={(value: boolean) => handleInputChange('isOnline', value)}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="materialsProvided">Materials Provided</Label>
                      <Textarea
                        id="materialsProvided"
                        value={formData.materialsProvided}
                        onChange={(e) => handleInputChange('materialsProvided', e.target.value)}
                        rows={3}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="materialsNeededFromClub">Materials Needed From Club</Label>
                      <Textarea
                        id="materialsNeededFromClub"
                        value={formData.materialsNeededFromClub}
                        onChange={(e) => handleInputChange('materialsNeededFromClub', e.target.value)}
                        rows={3}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="venueRequirements">Venue Requirements</Label>
                      <Textarea
                        id="venueRequirements"
                        value={formData.venueRequirements}
                        onChange={(e) => handleInputChange('venueRequirements', e.target.value)}
                        rows={3}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="otherImportantInfo">Other Important Info</Label>
                      <Textarea
                        id="otherImportantInfo"
                        value={formData.otherImportantInfo}
                        onChange={(e) => handleInputChange('otherImportantInfo', e.target.value)}
                        rows={3}
                        className="mt-1"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-3">
                    <Checkbox
                      id="detailsConfirmed"
                      checked={formData.detailsConfirmed}
                      onCheckedChange={(checked) => handleInputChange('detailsConfirmed', checked === true)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="detailsConfirmed" className="leading-normal">
                      Host confirms submitted details are accurate
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="rejectComment">Rejection Note (optional)</Label>
                    <Textarea
                      id="rejectComment"
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      rows={2}
                      className="mt-1"
                      placeholder="Optional note for the host"
                      disabled={!canReject}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving || !canEdit || !isDirty}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving || !canCancel}>
                      Cancel Workshop
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={isSaving || !canReject}>
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={handleApprove} disabled={isSaving || !canApprove}>
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
