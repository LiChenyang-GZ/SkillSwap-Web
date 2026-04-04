import { useEffect, useRef, useState } from 'react';
import { categories } from '../../lib/mock-data';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Globe, Info } from 'lucide-react';
import {
  defaultCreateWorkshopFormValues,
  isCreateWorkshopFormSubmittable,
  validateCreateWorkshopForm,
  type CreateWorkshopFieldErrors,
  type CreateWorkshopFormField,
  type CreateWorkshopFormValues,
} from './schema';
import { useCreateWorkshopSubmit } from './useCreateWorkshopSubmit';

export function CreateWorkshopForm() {
  const { user, setCurrentPage } = useApp();
  const [values, setValues] = useState<CreateWorkshopFormValues>(defaultCreateWorkshopFormValues);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CreateWorkshopFieldErrors>({});
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const { isSubmitting, submit } = useCreateWorkshopSubmit();

  const validationResult = validateCreateWorkshopForm(values);
  const canSubmit = isCreateWorkshopFormSubmittable(values);

  const setField = <K extends keyof CreateWorkshopFormValues>(field: K, value: CreateWorkshopFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!showValidationFeedback) return;
    const nextValidationResult = validateCreateWorkshopForm(values);
    setFieldErrors((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextValidationResult.fieldErrors)) {
        return prev;
      }
      return nextValidationResult.fieldErrors;
    });
    setError((prev) => (prev === nextValidationResult.formError ? prev : nextValidationResult.formError));
  }, [showValidationFeedback, values]);

  const invalidClassName = 'border-destructive focus-visible:ring-destructive';
  const getFieldClassName = (field: CreateWorkshopFormField) =>
    `mt-1${fieldErrors[field] ? ` ${invalidClassName}` : ''}`;

  const fieldElementIdMap: Record<CreateWorkshopFormField, string> = {
    hostName: 'hostName',
    title: 'title',
    category: 'category-trigger',
    contactNumber: 'contactNumber',
    date: 'date',
    time: 'time',
    duration: 'duration',
    maxParticipants: 'maxParticipants',
    isOnline: 'isOnline',
    materialsProvided: 'materialsProvided',
    materialsNeededFromClub: 'materialsNeededFromClub',
    venueRequirements: 'venueRequirements',
    otherImportantInfo: 'otherImportantInfo',
    detailsConfirmed: 'detailsConfirmed',
  };

  const focusFirstInvalidField = (field: CreateWorkshopFormField | null) => {
    if (!field) return;
    requestAnimationFrame(() => {
      const targetId = fieldElementIdMap[field];
      const target = document.getElementById(targetId);
      if (target instanceof HTMLElement) {
        target.focus();
      }
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validationResult.isValid) {
      setShowValidationFeedback(true);
      setFieldErrors(validationResult.fieldErrors);
      setError(validationResult.formError);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      focusFirstInvalidField(validationResult.firstInvalidField);
      return;
    }

    setShowValidationFeedback(false);
    setFieldErrors({});
    setError(null);
    await submit(values);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      <input
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="username"
        className="hidden"
      />
      <input
        tabIndex={-1}
        aria-hidden="true"
        type="password"
        autoComplete="new-password"
        className="hidden"
      />
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Final Workshop Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hostName">Host name *</Label>
              <Input
                id="hostName"
                autoComplete="off"
                value={values.hostName}
                onChange={(e) => setField('hostName', e.target.value)}
                aria-invalid={Boolean(fieldErrors.hostName)}
                className={getFieldClassName('hostName')}
                placeholder="Your display name for this workshop"
              />
              {fieldErrors.hostName && <p className="mt-1 text-xs text-destructive">{fieldErrors.hostName}</p>}
            </div>
            <div>
              <Label htmlFor="title">Workshop Name / Skill Taught *</Label>
              <Input
                id="title"
                autoComplete="off"
                value={values.title}
                onChange={(e) => setField('title', e.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
                className={getFieldClassName('title')}
                placeholder="e.g., Acrylic Painting Basics"
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p>}
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={values.category}
                onValueChange={(next: string) => setField('category', next)}
                modal={false}
              >
                <SelectTrigger
                  id="category-trigger"
                  aria-invalid={Boolean(fieldErrors.category)}
                  className={`mt-1${fieldErrors.category ? ` ${invalidClassName}` : ''}`}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.category && <p className="mt-1 text-xs text-destructive">{fieldErrors.category}</p>}
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact number *</Label>
              <Input
                id="contactNumber"
                autoComplete="off"
                value={values.contactNumber}
                onChange={(e) => setField('contactNumber', e.target.value)}
                aria-invalid={Boolean(fieldErrors.contactNumber)}
                className={getFieldClassName('contactNumber')}
                placeholder="e.g., 04XXXXXXXX"
              />
              {fieldErrors.contactNumber && <p className="mt-1 text-xs text-destructive">{fieldErrors.contactNumber}</p>}
            </div>
            <div>
              <Label htmlFor="date">Confirmed workshop date *</Label>
              <Input
                id="date"
                type="date"
                autoComplete="off"
                value={values.date}
                onChange={(e) => setField('date', e.target.value)}
                aria-invalid={Boolean(fieldErrors.date)}
                className={getFieldClassName('date')}
              />
              {fieldErrors.date && <p className="mt-1 text-xs text-destructive">{fieldErrors.date}</p>}
            </div>
            <div>
              <Label htmlFor="time">Confirmed workshop time *</Label>
              <Input
                id="time"
                type="time"
                autoComplete="off"
                value={values.time}
                onChange={(e) => setField('time', e.target.value)}
                aria-invalid={Boolean(fieldErrors.time)}
                className={getFieldClassName('time')}
              />
              {fieldErrors.time && <p className="mt-1 text-xs text-destructive">{fieldErrors.time}</p>}
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                autoComplete="off"
                value={values.duration}
                onChange={(e) => setField('duration', e.target.value)}
                aria-invalid={Boolean(fieldErrors.duration)}
                className={getFieldClassName('duration')}
                placeholder="e.g., 60"
              />
              {fieldErrors.duration && <p className="mt-1 text-xs text-destructive">{fieldErrors.duration}</p>}
            </div>
            <div>
              <Label htmlFor="maxParticipants">Maximum participants preferred (optional)</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                autoComplete="off"
                value={values.maxParticipants}
                onChange={(e) => setField('maxParticipants', e.target.value)}
                aria-invalid={Boolean(fieldErrors.maxParticipants)}
                className={getFieldClassName('maxParticipants')}
                placeholder="e.g., 30"
              />
              {fieldErrors.maxParticipants && <p className="mt-1 text-xs text-destructive">{fieldErrors.maxParticipants}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4" />
              <span>{values.isOnline ? 'Online workshop' : 'In-person workshop (location confirmed by admin later)'}</span>
            </div>
            <Switch checked={values.isOnline} onCheckedChange={(checked: boolean) => setField('isOnline', checked)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="materialsProvided">Materials you will provide (optional)</Label>
              <Textarea
                id="materialsProvided"
                rows={3}
                autoComplete="off"
                value={values.materialsProvided}
                onChange={(e) => setField('materialsProvided', e.target.value)}
                className="mt-1"
                placeholder="e.g., brushes, printed worksheet"
              />
            </div>
            <div>
              <Label htmlFor="materialsNeededFromClub">Materials required from Skill Swap Club (optional)</Label>
              <Textarea
                id="materialsNeededFromClub"
                rows={3}
                autoComplete="off"
                value={values.materialsNeededFromClub}
                onChange={(e) => setField('materialsNeededFromClub', e.target.value)}
                className="mt-1"
                placeholder="e.g., projector, extra tables"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venueRequirements">Requirements on the venue (optional)</Label>
              <Textarea
                id="venueRequirements"
                rows={3}
                autoComplete="off"
                value={values.venueRequirements}
                onChange={(e) => setField('venueRequirements', e.target.value)}
                className="mt-1"
                placeholder="e.g., room size, table setup"
              />
            </div>
            <div>
              <Label htmlFor="otherImportantInfo">Any other important information (optional)</Label>
              <Textarea
                id="otherImportantInfo"
                rows={3}
                autoComplete="off"
                value={values.otherImportantInfo}
                onChange={(e) => setField('otherImportantInfo', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Submitted account</p>
              <p>Username: {user?.username || 'Unknown'}</p>
              <p>Email: {user?.email || 'Unknown'}</p>
              <p className="flex items-start gap-2 pt-1">
                <Info className="w-4 h-4 mt-0.5" />
                <span>The account info is attached automatically during submission.</span>
              </p>
            </CardContent>
          </Card>

          <div
            className={`flex items-center gap-3 rounded-md border border-border px-3 py-3${fieldErrors.detailsConfirmed ? ' border-destructive' : ''}`}
          >
            <Checkbox
              id="detailsConfirmed"
              checked={values.detailsConfirmed}
              onCheckedChange={(checked) => setField('detailsConfirmed', checked === true)}
            />
            <Label htmlFor="detailsConfirmed" className="leading-normal cursor-pointer">
              I confirm that the above details are accurate *
            </Label>
          </div>
          {fieldErrors.detailsConfirmed && <p className="mt-2 text-xs text-destructive">{fieldErrors.detailsConfirmed}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setCurrentPage('dashboard')}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit || isSubmitting} className="min-w-[140px]">
          {isSubmitting ? 'Creating...' : 'Create Workshop'}
        </Button>
      </div>
    </form>
  );
}
