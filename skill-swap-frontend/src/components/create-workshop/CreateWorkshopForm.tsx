import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  createWorkshopFormSchema,
  defaultCreateWorkshopFormValues,
  isCreateWorkshopFormSubmittable,
  type CreateWorkshopFormField,
  type CreateWorkshopFormValues,
} from './schema';
import { useCreateWorkshopSubmit } from './useCreateWorkshopSubmit';

export function CreateWorkshopForm() {
  const { user, setCurrentPage } = useApp();
  const formRef = useRef<HTMLFormElement | null>(null);
  const { isSubmitting, submit } = useCreateWorkshopSubmit();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, submitCount },
  } = useForm<CreateWorkshopFormValues>({
    resolver: zodResolver(createWorkshopFormSchema),
    defaultValues: defaultCreateWorkshopFormValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });

  const values = watch();
  const hasSubmitted = submitCount > 0;
  const canSubmit = isCreateWorkshopFormSubmittable(values);
  const error = hasSubmitted && Object.keys(errors).length > 0
    ? 'Please review the highlighted fields before submitting.'
    : null;

  const getFieldError = (field: CreateWorkshopFormField): string | null => {
    if (!hasSubmitted) return null;
    const message = errors[field]?.message;
    return typeof message === 'string' ? message : null;
  };

  const invalidClassName = 'border-destructive focus-visible:ring-destructive';
  const getFieldClassName = (field: CreateWorkshopFormField) => {
    const fieldError = getFieldError(field);
    return `mt-1${fieldError ? ` ${invalidClassName}` : ''}`;
  };

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

  const validationFieldOrder: CreateWorkshopFormField[] = [
    'hostName',
    'title',
    'category',
    'contactNumber',
    'date',
    'time',
    'duration',
    'maxParticipants',
    'detailsConfirmed',
  ];

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

  const handleValidSubmit = async (nextValues: CreateWorkshopFormValues) => {
    await submit(nextValues);
  };

  const handleInvalidSubmit = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstInvalidField = validationFieldOrder.find((field) => Boolean(errors[field])) ?? null;
    focusFirstInvalidField(firstInvalidField);
  };

  const formSubmitHandler = handleSubmit(handleValidSubmit, handleInvalidSubmit);

  return (
    <form ref={formRef} onSubmit={formSubmitHandler} className="space-y-6" autoComplete="off">
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
                {...register('hostName')}
                aria-invalid={Boolean(getFieldError('hostName'))}
                className={getFieldClassName('hostName')}
                placeholder="Your display name for this workshop"
              />
              {getFieldError('hostName') && <p className="mt-1 text-xs text-destructive">{getFieldError('hostName')}</p>}
            </div>
            <div>
              <Label htmlFor="title">Workshop Name / Skill Taught *</Label>
              <Input
                id="title"
                autoComplete="off"
                {...register('title')}
                aria-invalid={Boolean(getFieldError('title'))}
                className={getFieldClassName('title')}
                placeholder="e.g., Acrylic Painting Basics"
              />
              {getFieldError('title') && <p className="mt-1 text-xs text-destructive">{getFieldError('title')}</p>}
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={values.category}
                onValueChange={(next: string) => {
                  setValue('category', next, { shouldDirty: true, shouldValidate: true });
                }}
                modal={false}
              >
                <SelectTrigger
                  id="category-trigger"
                  aria-invalid={Boolean(getFieldError('category'))}
                  className={`mt-1${getFieldError('category') ? ` ${invalidClassName}` : ''}`}
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
              {getFieldError('category') && <p className="mt-1 text-xs text-destructive">{getFieldError('category')}</p>}
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact number *</Label>
              <Input
                id="contactNumber"
                autoComplete="off"
                {...register('contactNumber')}
                aria-invalid={Boolean(getFieldError('contactNumber'))}
                className={getFieldClassName('contactNumber')}
                placeholder="e.g., 04XXXXXXXX"
              />
              {getFieldError('contactNumber') && <p className="mt-1 text-xs text-destructive">{getFieldError('contactNumber')}</p>}
            </div>
            <div>
              <Label htmlFor="date">Confirmed workshop date *</Label>
              <Input
                id="date"
                type="date"
                autoComplete="off"
                {...register('date')}
                aria-invalid={Boolean(getFieldError('date'))}
                className={getFieldClassName('date')}
              />
              {getFieldError('date') && <p className="mt-1 text-xs text-destructive">{getFieldError('date')}</p>}
            </div>
            <div>
              <Label htmlFor="time">Confirmed workshop time *</Label>
              <Input
                id="time"
                type="time"
                autoComplete="off"
                {...register('time')}
                aria-invalid={Boolean(getFieldError('time'))}
                className={getFieldClassName('time')}
              />
              {getFieldError('time') && <p className="mt-1 text-xs text-destructive">{getFieldError('time')}</p>}
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                autoComplete="off"
                {...register('duration')}
                aria-invalid={Boolean(getFieldError('duration'))}
                className={getFieldClassName('duration')}
                placeholder="e.g., 60"
              />
              {getFieldError('duration') && <p className="mt-1 text-xs text-destructive">{getFieldError('duration')}</p>}
            </div>
            <div>
              <Label htmlFor="maxParticipants">Maximum participants preferred (optional)</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                autoComplete="off"
                {...register('maxParticipants')}
                aria-invalid={Boolean(getFieldError('maxParticipants'))}
                className={getFieldClassName('maxParticipants')}
                placeholder="e.g., 30"
              />
              {getFieldError('maxParticipants') && <p className="mt-1 text-xs text-destructive">{getFieldError('maxParticipants')}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4" />
              <span>{values.isOnline ? 'Online workshop' : 'In-person workshop (location confirmed by admin later)'}</span>
            </div>
            <Switch
              checked={values.isOnline}
              onCheckedChange={(checked: boolean) => {
                setValue('isOnline', checked, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="materialsProvided">Materials you will provide (optional)</Label>
              <Textarea
                id="materialsProvided"
                rows={3}
                autoComplete="off"
                {...register('materialsProvided')}
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
                {...register('materialsNeededFromClub')}
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
                {...register('venueRequirements')}
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
                {...register('otherImportantInfo')}
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
            className={`flex items-center gap-3 rounded-md border border-border px-3 py-3${getFieldError('detailsConfirmed') ? ' border-destructive' : ''}`}
          >
            <Checkbox
              id="detailsConfirmed"
              checked={values.detailsConfirmed}
              onCheckedChange={(checked) => {
                setValue('detailsConfirmed', checked === true, { shouldDirty: true, shouldValidate: true });
              }}
            />
            <Label htmlFor="detailsConfirmed" className="leading-normal cursor-pointer">
              I confirm that the above details are accurate *
            </Label>
          </div>
          {getFieldError('detailsConfirmed') && <p className="mt-2 text-xs text-destructive">{getFieldError('detailsConfirmed')}</p>}
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
