import type { ChangeEvent, FormEvent, RefObject } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type { User } from "../../../types/user";
import { DASHBOARD_PROFILE_NAME_MAX_LENGTH } from "../constants/dashboardUiConstants";

interface DashboardEditProfileDialogProps {
  user: User;
  isEditProfileOpen: boolean;
  editUsername: string;
  isSavingProfile: boolean;
  pendingAvatarFile: File | null;
  pendingAvatarPreviewUrl: string | null;
  profileError: string | null;
  avatarFileInputRef: RefObject<HTMLInputElement>;
  onEditUsernameChange: (value: string) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function DashboardEditProfileDialog({
  user,
  isEditProfileOpen,
  editUsername,
  isSavingProfile,
  pendingAvatarFile,
  pendingAvatarPreviewUrl,
  profileError,
  avatarFileInputRef,
  onEditUsernameChange,
  onAvatarFileChange,
  onOpenChange,
  onSave,
}: DashboardEditProfileDialogProps) {
  return (
    <Dialog open={isEditProfileOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={onAvatarFileChange}
                />
                <Button type="button" variant="outline" disabled={isSavingProfile} onClick={() => avatarFileInputRef.current?.click()}>
                  Choose Avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG/WEBP, up to 10MB.</p>
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
