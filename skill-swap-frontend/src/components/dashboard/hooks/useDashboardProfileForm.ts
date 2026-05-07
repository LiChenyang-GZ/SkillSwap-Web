import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import type { User } from "../../../types/user";
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditUsername(user?.username ?? "");
  }, [user?.username]);

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
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const handleEditProfileOpenChange = (open: boolean) => {
    if (!open) {
      resetEditProfileDraft();
    }
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
    const hasAvatarChange = pendingAvatarFile !== null;
    if (!hasNameChange && !hasAvatarChange) {
      setIsEditProfileOpen(false);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (hasNameChange) {
        await updateCurrentUserProfile({ username: nextUsername });
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
    resetEditProfileDraft();
    setIsEditProfileOpen(true);
  };

  return {
    isEditProfileOpen,
    editUsername,
    isSavingProfile,
    pendingAvatarFile,
    pendingAvatarPreviewUrl,
    profileError,
    avatarFileInputRef,
    setEditUsername,
    handleEditProfileOpenChange,
    handleSaveProfile,
    handleAvatarFileChange,
    openEditProfileDialog,
  };
}
