import { OTHER_OPTION, UNIVERSITY_OPTIONS } from "../constants/universityOptions";

export const isKnownUniversity = (name?: string): boolean =>
  !!name && UNIVERSITY_OPTIONS.includes(name);

// Display value for a stored university (the name itself, or a fallback label).
export const getUniversityDisplayName = (name?: string): string =>
  name?.trim() || "University not set";

// Split a stored university name into the dropdown selection + custom-name draft.
export const toUniversityDraft = (
  university?: string
): { selection: string; customName: string } => {
  if (isKnownUniversity(university)) return { selection: university as string, customName: "" };
  if (university) return { selection: OTHER_OPTION, customName: university };
  return { selection: "", customName: "" };
};

// Resolve a dropdown selection + custom name into the value to persist.
export const resolveUniversity = (selection: string, customName: string): string =>
  selection === OTHER_OPTION ? customName.trim().replace(/\s+/g, " ") : selection;
