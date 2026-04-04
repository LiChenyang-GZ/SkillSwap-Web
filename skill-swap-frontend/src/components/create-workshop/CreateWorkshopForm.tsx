import { useState } from 'react';
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
import { defaultCreateWorkshopFormValues, validateCreateWorkshopForm, type CreateWorkshopFormValues } from './schema';
import { useCreateWorkshopSubmit } from './useCreateWorkshopSubmit';

export function CreateWorkshopForm() {
  const { user, setCurrentPage } = useApp();
  const [values, setValues] = useState<CreateWorkshopFormValues>(defaultCreateWorkshopFormValues);
  const [error, setError] = useState<string | null>(null);
  const { isSubmitting, submit } = useCreateWorkshopSubmit();

  const setField = <K extends keyof CreateWorkshopFormValues>(field: K, value: CreateWorkshopFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateCreateWorkshopForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    await submit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                value={values.hostName}
                onChange={(e) => setField('hostName', e.target.value)}
                className="mt-1"
                placeholder="Your display name for this workshop"
              />
            </div>
            <div>
              <Label htmlFor="title">Workshop Name / Skill Taught *</Label>
              <Input
                id="title"
                value={values.title}
                onChange={(e) => setField('title', e.target.value)}
                className="mt-1"
                placeholder="e.g., Acrylic Painting Basics"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={values.category}
                onValueChange={(next: string) => setField('category', next)}
                modal={false}
              >
                <SelectTrigger className="mt-1">
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
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact number *</Label>
              <Input
                id="contactNumber"
                value={values.contactNumber}
                onChange={(e) => setField('contactNumber', e.target.value)}
                className="mt-1"
                placeholder="e.g., 04XXXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="date">Confirmed workshop date *</Label>
              <Input
                id="date"
                type="date"
                value={values.date}
                onChange={(e) => setField('date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="time">Confirmed workshop time *</Label>
              <Input
                id="time"
                type="time"
                value={values.time}
                onChange={(e) => setField('time', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={values.duration}
                onChange={(e) => setField('duration', e.target.value)}
                className="mt-1"
                placeholder="e.g., 60"
              />
            </div>
            <div>
              <Label htmlFor="maxParticipants">Maximum participants preferred</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                value={values.maxParticipants}
                onChange={(e) => setField('maxParticipants', e.target.value)}
                className="mt-1"
                placeholder="Leave empty if N/A"
              />
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
              <Label htmlFor="materialsProvided">Materials you will provide</Label>
              <Textarea
                id="materialsProvided"
                rows={3}
                value={values.materialsProvided}
                onChange={(e) => setField('materialsProvided', e.target.value)}
                className="mt-1"
                placeholder="Leave empty if N/A"
              />
            </div>
            <div>
              <Label htmlFor="materialsNeededFromClub">Materials required from Skill Swap Club</Label>
              <Textarea
                id="materialsNeededFromClub"
                rows={3}
                value={values.materialsNeededFromClub}
                onChange={(e) => setField('materialsNeededFromClub', e.target.value)}
                className="mt-1"
                placeholder="Leave empty if N/A"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venueRequirements">Requirements on the venue (optional)</Label>
              <Textarea
                id="venueRequirements"
                rows={3}
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

          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-3">
            <Checkbox
              id="detailsConfirmed"
              checked={values.detailsConfirmed}
              onCheckedChange={(checked) => setField('detailsConfirmed', checked === true)}
            />
            <Label htmlFor="detailsConfirmed" className="leading-normal cursor-pointer">
              I confirm that the above details are accurate *
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setCurrentPage('dashboard')}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? 'Creating...' : 'Create Workshop'}
        </Button>
      </div>
    </form>
  );
}
