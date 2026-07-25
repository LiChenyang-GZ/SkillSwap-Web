import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { OTHER_OPTION, UNIVERSITY_OPTIONS } from "../constants/universityOptions";

interface UniversityFieldsProps {
  idPrefix: string;
  selection: string;
  customName: string;
  disabled?: boolean;
  onSelectionChange: (value: string) => void;
  onCustomNameChange: (value: string) => void;
}

export function UniversityFields({
  idPrefix,
  selection,
  customName,
  disabled = false,
  onSelectionChange,
  onCustomNameChange,
}: UniversityFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-university`}>University</Label>
        <Select
          value={selection}
          disabled={disabled}
          onValueChange={(value) => {
            onSelectionChange(value);
            if (value !== OTHER_OPTION) onCustomNameChange("");
          }}
        >
          <SelectTrigger id={`${idPrefix}-university`} className="h-11">
            <SelectValue placeholder="Select your university" />
          </SelectTrigger>
          <SelectContent>
            {UNIVERSITY_OPTIONS.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
            <SelectItem value={OTHER_OPTION}>Another university</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selection === OTHER_OPTION && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-university-name`}>University name</Label>
          <Input
            id={`${idPrefix}-university-name`}
            value={customName}
            onChange={(event) => onCustomNameChange(event.target.value)}
            placeholder="e.g. Macquarie University"
            minLength={2}
            maxLength={100}
            disabled={disabled}
            required
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">Enter the official name so other students can recognise your campus.</p>
        </div>
      )}
    </div>
  );
}
