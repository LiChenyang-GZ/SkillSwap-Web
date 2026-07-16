import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import type { UniversityCode, User } from "../../../types/user";
import {
  DASHBOARD_PROFILE_EMPTY_NAME_MESSAGE,
  DASHBOARD_PROFILE_FAILURE_MESSAGE,
  DASHBOARD_PROFILE_SUCCESS_MESSAGE,
} from "../constants/dashboardMessages";
import { validateAvatarFile } from "../utils/dashboardProfileUtils";
import type { DashboardProfileApi } from "../models/dashboardProfileFormModel";

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
  const [editUniversityCode, setEditUniversityCode] = useState<UniversityCode | "">("");
  const [editUniversityName, setEditUniversityName] = useState("");
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
    setEditUniversityCode(user?.universityCode ?? "");
    setEditUniversityName(user?.universityName ?? "");
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

    const hasNameChange = nextUsername !== user.username.trim();
    if (!editUniversityCode) {
      setProfileError("Please select your university.");
      return;
    }
    const nextUniversityName = editUniversityName.trim().replace(/\s+/g, " ");
    if (editUniversityCode === "OTHER" && nextUniversityName.length < 2) {
      setProfileError("Please enter your university name.");
      return;
    }
    const hasUniversityChange =
      editUniversityCode !== user.universityCode ||
      (editUniversityCode === "OTHER" && nextUniversityName !== (user.universityName || "").trim());
    const hasAvatarChange = pendingAvatarFile !== null;
    if (!hasNameChange && !hasUniversityChange && !hasAvatarChange) {
      setIsEditProfileOpen(false);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (hasNameChange || hasUniversityChange) {
        await updateCurrentUserProfile({
          ...(hasNameChange ? { username: nextUsername } : {}),
          ...(hasUniversityChange
            ? {
                universityCode: editUniversityCode,
                universityName: editUniversityCode === "OTHER" ? nextUniversityName : undefined,
              }
            : {}),
        });
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
    editUniversityCode,
    editUniversityName,
    isSavingProfile,
    pendingAvatarFile,
    pendingAvatarPreviewUrl,
    profileError,
    avatarFileInputRef,
    setEditUsername,
    setEditUniversityCode,
    setEditUniversityName,
    handleEditProfileOpenChange,
    handleSaveProfile,
    handleAvatarFileChange,
    openEditProfileDialog,
  };
}
