import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { User } from "../../types/user";
import {
  type BackendUserProfile,
  decodeJwtPayload,
  mapBackendUser,
} from "../../shared/service/auth/appAuthService";
import { userProfileService } from "../../shared/service/user/userProfileService";
import type {
  CurrentUserProfileUpdates,
  GetAuthToken,
  RecentProfileCache,
} from "./appContextTypes";

interface UseCurrentUserProfileActionsParams {
  getAuthToken: GetAuthToken;
  recentProfileCacheRef: MutableRefObject<RecentProfileCache | null>;
  setUser: Dispatch<SetStateAction<User | null>>;
}

export const useCurrentUserProfileActions = ({
  getAuthToken,
  recentProfileCacheRef,
  setUser,
}: UseCurrentUserProfileActionsParams) => {
  const updateCurrentUserProfile = useCallback(
    async (updates: CurrentUserProfileUpdates): Promise<User> => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Please sign in again before updating your profile.");
      }

      const profile = await userProfileService.updateCurrentUserProfile<BackendUserProfile>(updates, token);
      const mapped = mapBackendUser(profile);

      setUser(mapped);

      const payload = decodeJwtPayload(token) as { sub?: string } | null;
      recentProfileCacheRef.current = {
        subject: payload?.sub ?? null,
        user: mapped,
        at: Date.now(),
      };

      return mapped;
    },
    [getAuthToken, recentProfileCacheRef, setUser]
  );

  const uploadCurrentUserAvatar = useCallback(
    async (file: File): Promise<User> => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Please sign in again before updating your avatar.");
      }

      const profile = await userProfileService.uploadCurrentUserAvatar<BackendUserProfile>(file, token);
      const mapped = mapBackendUser(profile);

      setUser(mapped);

      const payload = decodeJwtPayload(token) as { sub?: string } | null;
      recentProfileCacheRef.current = {
        subject: payload?.sub ?? null,
        user: mapped,
        at: Date.now(),
      };

      return mapped;
    },
    [getAuthToken, recentProfileCacheRef, setUser]
  );

  return {
    updateCurrentUserProfile,
    uploadCurrentUserAvatar,
  };
};
