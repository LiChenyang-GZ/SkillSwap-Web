import type { UniversityCode } from "../../../types/user";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { UNIVERSITY_OPTIONS } from "../constants/universityOptions";

interface UniversityFieldsProps {
  idPrefix: string;
  universityCode: UniversityCode | "";
  universityName: string;
  disabled?: boolean;
  onUniversityCodeChange: (value: UniversityCode) => void;
  onUniversityNameChange: (value: string) => void;
}

export function UniversityFields({
  idPrefix,
  universityCode,
  universityName,
  disabled = false,
  onUniversityCodeChange,
  onUniversityNameChange,
}: UniversityFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-university`}>University</Label>
        <Select
          value={universityCode}
          disabled={disabled}
          onValueChange={(value) => {
            const nextCode = value as UniversityCode;
            onUniversityCodeChange(nextCode);
            if (nextCode !== "OTHER") onUniversityNameChange("");
          }}
        >
          <SelectTrigger id={`${idPrefix}-university`} className="h-11">
            <SelectValue placeholder="Select your university" />
          </SelectTrigger>
          <SelectContent>
            {UNIVERSITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="font-medium">{option.shortLabel}</span>
                <span className="text-muted-foreground">— {option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {universityCode === "OTHER" && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-university-name`}>University name</Label>
          <Input
            id={`${idPrefix}-university-name`}
            value={universityName}
            onChange={(event) => onUniversityNameChange(event.target.value)}
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
