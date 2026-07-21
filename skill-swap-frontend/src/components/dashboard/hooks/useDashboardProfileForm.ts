import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import type { User } from "../../../types/user";
import {
  DASHBOARD_PROFILE_EMPTY_NAME_MESSAGE,
  DASHBOARD_PROFILE_FAILURE_MESSAGE,
  DASHBOARD_PROFILE_SKILL_DUPLICATE_MESSAGE,
  DASHBOARD_PROFILE_SKILL_EMPTY_MESSAGE,
  DASHBOARD_PROFILE_SKILL_TOO_LONG_MESSAGE,
  DASHBOARD_PROFILE_SKILLS_LIMIT_MESSAGE,
  DASHBOARD_PROFILE_SUCCESS_MESSAGE,
} from "../constants/dashboardMessages";
import {
  DASHBOARD_PROFILE_BIO_MAX_LENGTH,
  DASHBOARD_PROFILE_SKILL_MAX_LENGTH,
  DASHBOARD_PROFILE_SKILLS_MAX_COUNT,
} from "../constants/dashboardUiConstants";
import { validateAvatarFile } from "../utils/dashboardProfileUtils";
import type { DashboardProfileApi, DashboardProfileUpdates } from "../models/dashboardProfileFormModel";

const areSkillListsEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((skill, index) => skill === b[index]);

interface UseDashboardProfileFormParams extends DashboardProfileApi {
  user: User | null;
}

export function useDashboardProfileForm({
  user,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
}: UseDashboardProfileFormParams) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  const resetEditProfileDraft = () => {
    setProfileError(null);
    setEditUsername(user?.username ?? "");
    setEditBio(user?.bio ?? "");
    setEditSkills(user?.skills ?? []);
    setSkillDraft("");
    setSkillError(null);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const handleEditProfileOpenChange = (open: boolean) => {
    if (open === isEditProfileOpen) {
      return;
    }

    resetEditProfileDraft();
    setIsEditProfileOpen(open);
  };

  const validateNewSkill = (candidate: string, currentSkills: string[]): string | null => {
    if (!candidate) {
      return DASHBOARD_PROFILE_SKILL_EMPTY_MESSAGE;
    }
    if (candidate.length > DASHBOARD_PROFILE_SKILL_MAX_LENGTH) {
      return DASHBOARD_PROFILE_SKILL_TOO_LONG_MESSAGE;
    }
    if (currentSkills.length >= DASHBOARD_PROFILE_SKILLS_MAX_COUNT) {
      return DASHBOARD_PROFILE_SKILLS_LIMIT_MESSAGE;
    }
    if (currentSkills.some((skill) => skill.toLowerCase() === candidate.toLowerCase())) {
      return DASHBOARD_PROFILE_SKILL_DUPLICATE_MESSAGE;
    }
    return null;
  };

  const addSkillFromDraft = (): boolean => {
    const candidate = skillDraft.trim();
    const message = validateNewSkill(candidate, editSkills);
    if (message) {
      setSkillError(message);
      return false;
    }

    setEditSkills((previous) => [...previous, candidate]);
    setSkillDraft("");
    setSkillError(null);
    return true;
  };

  const removeSkill = (skillToRemove: string) => {
    setEditSkills((previous) => previous.filter((skill) => skill !== skillToRemove));
    setSkillError(null);
  };

  const handleSkillDraftChange = (value: string) => {
    setSkillDraft(value);
    if (skillError) {
      setSkillError(null);
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    const nextUsername = editUsername.trim();
    if (!nextUsername) {
      setProfileError(DASHBOARD_PROFILE_EMPTY_NAME_MESSAGE);
      return;
    }

    // A skill typed but not yet added should not be lost silently: add it,
    // or surface its validation message and keep the dialog open.
    let nextSkills = editSkills;
    if (skillDraft.trim()) {
      const candidate = skillDraft.trim();
      const message = validateNewSkill(candidate, editSkills);
      if (message) {
        setSkillError(message);
        return;
      }
      nextSkills = [...editSkills, candidate];
      setEditSkills(nextSkills);
      setSkillDraft("");
    }

    const nextBio = editBio.trim().slice(0, DASHBOARD_PROFILE_BIO_MAX_LENGTH);

    // Send only the fields that actually changed so an avatar-only or
    // name-only save can never clobber bio or skills.
    const textUpdates: DashboardProfileUpdates = {};
    if (nextUsername !== user.username.trim()) {
      textUpdates.username = nextUsername;
    }
    if (nextBio !== (user.bio ?? "").trim()) {
      textUpdates.bio = nextBio;
    }
    if (!areSkillListsEqual(nextSkills, user.skills ?? [])) {
      textUpdates.skills = nextSkills;
    }

    const hasTextChange = Object.keys(textUpdates).length > 0;
    const hasAvatarChange = pendingAvatarFile !== null;
    if (!hasTextChange && !hasAvatarChange) {
      setIsEditProfileOpen(false);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (hasTextChange) {
        await updateCurrentUserProfile(textUpdates);
      }
      if (pendingAvatarFile) {
        await uploadCurrentUserAvatar(pendingAvatarFile);
      }
      toast.success(DASHBOARD_PROFILE_SUCCESS_MESSAGE);
      resetEditProfileDraft();
      setIsEditProfileOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : DASHBOARD_PROFILE_FAILURE_MESSAGE;
      setProfileError(message);
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const message = validateAvatarFile(file);
    if (message) {
      setProfileError(message);
      toast.error(message);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfileError(null);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return previewUrl;
    });
  };

  const openEditProfileDialog = () => {
    if (isEditProfileOpen) {
      return;
    }

    resetEditProfileDraft();
    setIsEditProfileOpen(true);
  };

  return {
    isEditProfileOpen,
    editUsername,
    editBio,
    editSkills,
    skillDraft,
    skillError,
    isSavingProfile,
    pendingAvatarFile,
    pendingAvatarPreviewUrl,
    profileError,
    avatarFileInputRef,
    setEditUsername,
    setEditBio,
    handleSkillDraftChange,
    addSkillFromDraft,
    removeSkill,
    handleEditProfileOpenChange,
    handleSaveProfile,
    handleAvatarFileChange,
    openEditProfileDialog,
  };
}
