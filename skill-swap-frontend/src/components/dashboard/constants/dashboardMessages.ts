import { IMAGE_UPLOAD_MAX_LABEL, IMAGE_UPLOAD_UNSUPPORTED_MESSAGE } from "../../../shared/constants/uploadLimits";

export const DASHBOARD_AUTH_REQUIRED_MESSAGE = "Please sign in to view your dashboard.";
export const DASHBOARD_HIDE_SIGNIN_MESSAGE = "Please sign in again to update your dashboard.";
export const DASHBOARD_HIDE_SUCCESS_MESSAGE = "Removed from hosting list.";
export const DASHBOARD_HIDE_FAILURE_MESSAGE = "Failed to remove workshop.";
export const DASHBOARD_PROFILE_EMPTY_NAME_MESSAGE = "Name cannot be empty.";
export const DASHBOARD_PROFILE_SUCCESS_MESSAGE = "Profile updated successfully.";
export const DASHBOARD_PROFILE_FAILURE_MESSAGE = "Failed to update profile.";
export const DASHBOARD_PROFILE_SKILL_EMPTY_MESSAGE = "Type a skill before adding it.";
export const DASHBOARD_PROFILE_SKILL_DUPLICATE_MESSAGE = "You have already added that skill.";
export const DASHBOARD_PROFILE_SKILL_TOO_LONG_MESSAGE = "Skills can be at most 100 characters.";
export const DASHBOARD_PROFILE_SKILLS_LIMIT_MESSAGE = "You can list up to 50 skills.";
export const DASHBOARD_AVATAR_UNSUPPORTED_MESSAGE = IMAGE_UPLOAD_UNSUPPORTED_MESSAGE;
export const DASHBOARD_AVATAR_TOO_LARGE_MESSAGE = `Image size must be ${IMAGE_UPLOAD_MAX_LABEL} or smaller.`;

