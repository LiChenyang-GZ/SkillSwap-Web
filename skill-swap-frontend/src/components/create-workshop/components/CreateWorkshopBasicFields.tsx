import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { CREATE_WORKSHOP_CATEGORY_OPTIONS } from '../constants/createWorkshopOptionsConstants';
import type { CreateWorkshopFormField, CreateWorkshopFormValues } from '../models/createWorkshopFormModel';

interface CreateWorkshopBasicFieldsProps {
  values: CreateWorkshopFormValues;
  invalidClassName: string;
  getFieldError: (field: CreateWorkshopFormField) => string | null;
  getFieldClassName: (field: CreateWorkshopFormField) => string;
  setField: (field: CreateWorkshopFormField, value: string | boolean) => void;
}

export function CreateWorkshopBasicFields({
  values,
  invalidClassName,
  getFieldError,
  getFieldClassName,
  setField,
}: CreateWorkshopBasicFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hostName">Host name *</Label>
          <Input
            id="hostName"
            autoComplete="off"
            value={values.hostName}
            onChange={(event) => setField('hostName', event.target.value)}
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
            value={values.title}
            onChange={(event) => setField('title', event.target.value)}
            aria-invalid={Boolean(getFieldError('title'))}
            className={getFieldClassName('title')}
            placeholder="e.g., Acrylic Painting Basics"
          />
          {getFieldError('title') && <p className="mt-1 text-xs text-destructive">{getFieldError('title')}</p>}
        </div>
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={values.category} onValueChange={(next: string) => setField('category', next)} modal={false}>
            <SelectTrigger
              id="category-trigger"
              aria-invalid={Boolean(getFieldError('category'))}
              className={`mt-1${getFieldError('category') ? ` ${invalidClassName}` : ''}`}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CREATE_WORKSHOP_CATEGORY_OPTIONS.map((category) => (
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
            value={values.contactNumber}
            onChange={(event) => setField('contactNumber', event.target.value)}
            aria-invalid={Boolean(getFieldError('contactNumber'))}
            className={getFieldClassName('contactNumber')}
            placeholder="e.g., 04XXXXXXXX"
          />
          {getFieldError('contactNumber') && (
            <p className="mt-1 text-xs text-destructive">{getFieldError('contactNumber')}</p>
          )}
        </div>
        <div>
          <Label htmlFor="date">Confirmed workshop date *</Label>
          <Input
            id="date"
            type="date"
            autoComplete="off"
            value={values.date}
            onChange={(event) => setField('date', event.target.value)}
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
            value={values.time}
            onChange={(event) => setField('time', event.target.value)}
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
            value={values.duration}
            onChange={(event) => setField('duration', event.target.value)}
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
            value={values.maxParticipants}
            onChange={(event) => setField('maxParticipants', event.target.value)}
            aria-invalid={Boolean(getFieldError('maxParticipants'))}
            className={getFieldClassName('maxParticipants')}
            placeholder="e.g., 30"
          />
          {getFieldError('maxParticipants') && (
            <p className="mt-1 text-xs text-destructive">{getFieldError('maxParticipants')}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4" />
          <span>{values.isOnline ? 'Online workshop' : 'In-person workshop (location confirmed by admin later)'}</span>
        </div>
        <Switch checked={values.isOnline} onCheckedChange={(checked: boolean) => setField('isOnline', checked)} />
      </div>
    </>
  );
}
