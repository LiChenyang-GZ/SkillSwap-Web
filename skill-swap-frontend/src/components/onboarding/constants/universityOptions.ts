import type { UniversityCode } from "../../../types/user";

export const UNIVERSITY_OPTIONS: Array<{ value: UniversityCode; label: string; shortLabel: string }> = [
  { value: "USYD", label: "University of Sydney", shortLabel: "USYD" },
  { value: "UNSW", label: "University of New South Wales", shortLabel: "UNSW" },
  { value: "UTS", label: "University of Technology Sydney", shortLabel: "UTS" },
  { value: "OTHER", label: "Another university", shortLabel: "Other" },
];

export const getUniversityDisplayName = (code?: UniversityCode, customName?: string) => {
  if (!code) return "University not set";
  if (code === "OTHER") return customName?.trim() || "Other university";
  return UNIVERSITY_OPTIONS.find((option) => option.value === code)?.shortLabel || code;
};
