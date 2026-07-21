import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { User } from "../../../types/user";
import {
  DASHBOARD_PROFILE_BIO_MAX_LENGTH,
  DASHBOARD_PROFILE_NAME_MAX_LENGTH,
  DASHBOARD_PROFILE_SKILL_MAX_LENGTH,
  DASHBOARD_PROFILE_SKILLS_MAX_COUNT,
} from "../constants/dashboardUiConstants";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_FORMATS_LABEL,
  IMAGE_UPLOAD_MAX_LABEL,
} from "../../../shared/constants/uploadLimits";

interface DashboardEditProfileDialogProps {
  user: User;
  isEditProfileOpen: boolean;
  editUsername: string;
  editBio: string;
  editSkills: string[];
  skillDraft: string;
  skillError: string | null;
  isSavingProfile: boolean;
  pendingAvatarFile: File | null;
  pendingAvatarPreviewUrl: string | null;
  profileError: string | null;
  avatarFileInputRef: RefObject<HTMLInputElement>;
  onEditUsernameChange: (value: string) => void;
  onEditBioChange: (value: string) => void;
  onSkillDraftChange: (value: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function DashboardEditProfileDialog({
  user,
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
  onEditUsernameChange,
  onEditBioChange,
  onSkillDraftChange,
  onAddSkill,
  onRemoveSkill,
  onAvatarFileChange,
  onOpenChange,
  onSave,
}: DashboardEditProfileDialogProps) {
  const handleSkillInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      onAddSkill();
    }
  };
  return (
    <Dialog open={isEditProfileOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void onSave(event);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage
                  key={(pendingAvatarPreviewUrl ?? user.avatarUrl) || "empty-avatar-edit"}
                  src={pendingAvatarPreviewUrl ?? user.avatarUrl}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username
                    .split(" ")
                    .map((n) => n[0])
                    .join("") || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  className="hidden"
                  aria-label="Choose profile avatar image"
                  onChange={onAvatarFileChange}
                />
                <Button type="button" variant="outline" disabled={isSavingProfile} onClick={() => avatarFileInputRef.current?.click()}>
                  Choose Avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1">{IMAGE_UPLOAD_FORMATS_LABEL}, up to {IMAGE_UPLOAD_MAX_LABEL}.</p>
                {pendingAvatarFile && <p className="text-xs text-foreground mt-1">Selected: {pendingAvatarFile.name}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-profile-name">Name</Label>
            <Input
              id="dashboard-profile-name"
              value={editUsername}
              onChange={(event) => onEditUsernameChange(event.target.value)}
              maxLength={DASHBOARD_PROFILE_NAME_MAX_LENGTH}
              placeholder="Enter your display name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-profile-email">Email</Label>
            <Input id="dashboard-profile-email" value={user.email} readOnly disabled />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="dashboard-profile-bio">About you</Label>
              <span
                className="text-xs text-muted-foreground"
                aria-live="polite"
                aria-label={`${editBio.length} of ${DASHBOARD_PROFILE_BIO_MAX_LENGTH} characters used`}
              >
                {editBio.length}/{DASHBOARD_PROFILE_BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="dashboard-profile-bio"
              value={editBio}
              onChange={(event) => onEditBioChange(event.target.value.slice(0, DASHBOARD_PROFILE_BIO_MAX_LENGTH))}
              maxLength={DASHBOARD_PROFILE_BIO_MAX_LENGTH}
              rows={3}
              placeholder="Tell the community a little about yourself"
              disabled={isSavingProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-profile-skill-input">Skills I can share</Label>
            {editSkills.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Your skills">
                {editSkills.map((skill) => (
                  <li key={skill}>
                    <Badge variant="outline" className="gap-1.5 py-1 pl-2.5 pr-1.5 text-sm font-medium">
                      {skill}
                      <button
                        type="button"
                        onClick={() => onRemoveSkill(skill)}
                        disabled={isSavingProfile}
                        aria-label={`Remove skill ${skill}`}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                id="dashboard-profile-skill-input"
                value={skillDraft}
                onChange={(event) => onSkillDraftChange(event.target.value)}
                onKeyDown={handleSkillInputKeyDown}
                maxLength={DASHBOARD_PROFILE_SKILL_MAX_LENGTH}
                placeholder="e.g. Watercolour basics"
                disabled={isSavingProfile}
                aria-describedby="dashboard-profile-skill-help dashboard-profile-skill-error"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onAddSkill}
                disabled={isSavingProfile}
                aria-label="Add skill"
              >
                Add
              </Button>
            </div>
            <p id="dashboard-profile-skill-help" className="text-xs text-muted-foreground">
              Press Enter or comma to add. Up to {DASHBOARD_PROFILE_SKILLS_MAX_COUNT} skills.
            </p>
            {skillError && (
              <p id="dashboard-profile-skill-error" role="alert" className="text-sm text-destructive">
                {skillError}
              </p>
            )}
          </div>

          {profileError && <p className="text-sm text-destructive">{profileError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingProfile}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
