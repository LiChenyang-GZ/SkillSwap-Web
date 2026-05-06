import { Check, Download, Globe, MapPin, RefreshCw, Upload, Users, X } from 'lucide-react';
import type { RefObject } from 'react';
import type { Workshop } from '../../../types/workshop';
import { workshopCategories } from '../../../constants/workshop';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { normalizeAdminWorkshopStatus } from '../../workshop/workshopStatusRules';
import {
  ADMIN_REVIEW_CANCELLABLE_STATUSES,
  ADMIN_REVIEW_NON_EDITABLE_STATUSES,
  ADMIN_REVIEW_PARTICIPANT_VISIBLE_STATUSES,
  ADMIN_REVIEW_REJECTION_NOTE_HIDDEN_STATUS,
  ADMIN_REVIEW_USU_APPROVAL_STATUS_OPTIONS,
} from '../constants/adminReviewStatusConstants';
import { ADMIN_REVIEW_EVENT_SUBMITTED_OPTIONS } from '../constants/adminReviewUiConstants';
import { WorkshopFormState } from '../models/adminReviewFormModel';
import { hasWorkshopStarted } from '../utils/adminReviewUtils';

interface AdminReviewDetailPanelProps {
  isLoading: boolean;
  isDetailLoading: boolean;
  isSaving: boolean;
  selectedWorkshop: Workshop | null;
  selectedHasDetail: boolean;
  selectedDetailError: string | null;
  formData: WorkshopFormState;
  rejectComment: string;
  localImagePreviewUrl: string | null;
  imageFileInputRef: RefObject<HTMLInputElement>;
  isDirty: boolean;
  onRetryLoadDetails: () => void;
  onInputChange: (field: keyof WorkshopFormState, value: string | boolean) => void;
  onRejectCommentChange: (value: string) => void;
  onImageFileSelection: (file: File | null) => void;
  onSave: () => void;
  onCancel: () => void;
  onReject: () => void;
  onApprove: () => void;
  onExportParticipantsExcel: (workshop: Workshop) => void;
}

export function AdminReviewDetailPanel({
  isLoading,
  isDetailLoading,
  isSaving,
  selectedWorkshop,
  selectedHasDetail,
  selectedDetailError,
  formData,
  rejectComment,
  localImagePreviewUrl,
  imageFileInputRef,
  isDirty,
  onRetryLoadDetails,
  onInputChange,
  onRejectCommentChange,
  onImageFileSelection,
  onSave,
  onCancel,
  onReject,
  onApprove,
  onExportParticipantsExcel,
}: AdminReviewDetailPanelProps) {
  const normalizedStatus = selectedWorkshop ? normalizeAdminWorkshopStatus(selectedWorkshop.status) : null;
  const hasStarted = selectedWorkshop ? hasWorkshopStarted(selectedWorkshop) : false;
  const canApprove = normalizedStatus === 'pending' && !hasStarted;
  const canReject = normalizedStatus === 'pending' && !hasStarted;
  const canEdit =
    normalizedStatus !== null &&
    !hasStarted &&
    !ADMIN_REVIEW_NON_EDITABLE_STATUSES.includes(
      normalizedStatus as (typeof ADMIN_REVIEW_NON_EDITABLE_STATUSES)[number]
    );
  const canCancel =
    normalizedStatus !== null &&
    !hasStarted &&
    ADMIN_REVIEW_CANCELLABLE_STATUSES.includes(
      normalizedStatus as (typeof ADMIN_REVIEW_CANCELLABLE_STATUSES)[number]
    );
  const shouldShowParticipants =
    normalizedStatus !== null &&
    ADMIN_REVIEW_PARTICIPANT_VISIBLE_STATUSES.includes(
      normalizedStatus as (typeof ADMIN_REVIEW_PARTICIPANT_VISIBLE_STATUSES)[number]
    );
  const shouldShowRejectionNote =
    normalizedStatus !== null && normalizedStatus !== ADMIN_REVIEW_REJECTION_NOTE_HIDDEN_STATUS;
  const participants = selectedWorkshop?.participants ?? [];
  const participantCount = participants.length || selectedWorkshop?.currentParticipants || 0;

  return (
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
          <div className="text-sm text-muted-foreground space-y-3">
            {selectedDetailError ? (
              <>
                <div>{selectedDetailError}</div>
                <Button variant="outline" size="sm" onClick={onRetryLoadDetails}>
                  Retry loading details
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading detailed submission...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <>
                  <div className="space-y-3">
                    <Label htmlFor="workshopImageUpload">Workshop Cover Image</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start">
                      <div className="aspect-video w-full rounded-md border border-border bg-muted overflow-hidden">
                        {formData.image ? (
                          <img src={formData.image} alt={formData.title || 'Workshop cover'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground px-3 text-center">
                            No custom cover uploaded yet. Category fallback image will be used.
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          ref={imageFileInputRef}
                          id="workshopImageUpload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const nextFile = event.target.files?.[0] || null;
                            onImageFileSelection(nextFile);
                            event.target.value = '';
                          }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => imageFileInputRef.current?.click()}
                            disabled={!canEdit || isSaving}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Cover Image
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          Image is applied only after you click Save Changes.
                        </p>
                        {localImagePreviewUrl && (
                          <p className="text-xs text-secondary">New image selected. Click Save Changes to apply.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hostName">Host Name</Label>
                      <Input id="hostName" value={formData.hostName} onChange={(e) => onInputChange('hostName', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="title">Workshop Name / Skill Taught</Label>
                      <Input id="title" value={formData.title} onChange={(e) => onInputChange('title', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value: string) => onInputChange('category', value)} modal={false}>
                        <SelectTrigger className="mt-1" disabled={!canEdit}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {workshopCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" value={formData.contactNumber} onChange={(e) => onInputChange('contactNumber', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input id="duration" type="number" value={formData.duration} onChange={(e) => onInputChange('duration', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
                      <Input id="maxParticipants" type="number" value={formData.maxParticipants} onChange={(e) => onInputChange('maxParticipants', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" type="date" value={formData.date} onChange={(e) => onInputChange('date', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input id="time" type="time" value={formData.time} onChange={(e) => onInputChange('time', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="attendCloseAt">Attend Close Time</Label>
                      <Input id="attendCloseAt" type="datetime-local" value={formData.attendCloseAt} onChange={(e) => onInputChange('attendCloseAt', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="weekNumber">Week #</Label>
                      <Input id="weekNumber" type="number" min={1} value={formData.weekNumber} onChange={(e) => onInputChange('weekNumber', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="memberResponsible">Member Responsible</Label>
                      <Input id="memberResponsible" value={formData.memberResponsible} onChange={(e) => onInputChange('memberResponsible', e.target.value)} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="eventSubmitted">Event Submit</Label>
                      <Select value={formData.eventSubmitted} onValueChange={(value: 'true' | 'false') => onInputChange('eventSubmitted', value)} modal={false}>
                        <SelectTrigger className="mt-1" disabled={!canEdit}>
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          {ADMIN_REVIEW_EVENT_SUBMITTED_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="usuApprovalStatus">Approved by USU</Label>
                      <Select value={formData.usuApprovalStatus} onValueChange={(value: 'pending' | 'approved') => onInputChange('usuApprovalStatus', value)} modal={false}>
                        <SelectTrigger className="mt-1" disabled={!canEdit}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {ADMIN_REVIEW_USU_APPROVAL_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="membersPresent">Member/s Present for Event</Label>
                    <Textarea id="membersPresent" value={formData.membersPresent} onChange={(e) => onInputChange('membersPresent', e.target.value)} rows={2} className="mt-1" disabled={!canEdit} />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => onInputChange('description', e.target.value)} rows={4} className="mt-1" disabled={!canEdit} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" value={formData.location} onChange={(e) => onInputChange('location', e.target.value)} className="mt-1" disabled={formData.isOnline || !canEdit} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        {formData.isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                        <span>{formData.isOnline ? 'Online workshop' : 'In-person workshop'}</span>
                      </div>
                      <Switch checked={formData.isOnline} onCheckedChange={(value: boolean) => onInputChange('isOnline', value)} disabled={!canEdit} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="materialsProvided">Materials Provided</Label>
                      <Textarea id="materialsProvided" value={formData.materialsProvided} onChange={(e) => onInputChange('materialsProvided', e.target.value)} rows={3} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="materialsNeededFromClub">Materials Needed From Club</Label>
                      <Textarea id="materialsNeededFromClub" value={formData.materialsNeededFromClub} onChange={(e) => onInputChange('materialsNeededFromClub', e.target.value)} rows={3} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="venueRequirements">Venue Requirements</Label>
                      <Textarea id="venueRequirements" value={formData.venueRequirements} onChange={(e) => onInputChange('venueRequirements', e.target.value)} rows={3} className="mt-1" disabled={!canEdit} />
                    </div>
                    <div>
                      <Label htmlFor="otherImportantInfo">Other Important Info</Label>
                      <Textarea id="otherImportantInfo" value={formData.otherImportantInfo} onChange={(e) => onInputChange('otherImportantInfo', e.target.value)} rows={3} className="mt-1" disabled={!canEdit} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-3">
                    <Checkbox id="detailsConfirmed" checked={formData.detailsConfirmed} onCheckedChange={(checked) => onInputChange('detailsConfirmed', checked === true)} disabled={!canEdit} />
                    <Label htmlFor="detailsConfirmed" className="leading-normal">
                      Host confirms submitted details are accurate
                    </Label>
                  </div>

                  {shouldShowParticipants && (
                    <div className="rounded-md border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-sm font-medium">Participants</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {participantCount} attendee{participantCount === 1 ? '' : 's'}
                          </Badge>
                          <Button type="button" size="sm" variant="outline" onClick={() => onExportParticipantsExcel(selectedWorkshop)} disabled={participantCount === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Export Excel
                          </Button>
                        </div>
                      </div>

                      {participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {participantCount > 0
                            ? `${participantCount} attendee(s) joined, but participant details are not available from the current API response.`
                            : 'No participants have joined this workshop yet.'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-auto pr-1">
                          {participants.map((participant) => {
                            const displayName = participant.username || participant.email || `User ${participant.id}`;
                            const email = participant.email || 'Email unavailable from API';
                            return (
                              <div key={participant.id} className="rounded-md border border-border px-3 py-2">
                                <p className="text-sm font-medium">{displayName}</p>
                                <p className="text-xs text-muted-foreground">{email}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {shouldShowRejectionNote && (
                    <div>
                      <Label htmlFor="rejectComment">Rejection Note (optional)</Label>
                      <Textarea
                        id="rejectComment"
                        value={rejectComment}
                        onChange={(e) => onRejectCommentChange(e.target.value)}
                        rows={2}
                        className="mt-1"
                        placeholder="Optional note for the host"
                        disabled={!canReject}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={onSave} disabled={isSaving || !canEdit || !isDirty}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={onCancel} disabled={isSaving || !canCancel}>
                      Cancel Workshop
                    </Button>
                    <Button variant="destructive" onClick={onReject} disabled={isSaving || !canReject}>
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={onApprove} disabled={isSaving || !canApprove}>
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
            </>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
