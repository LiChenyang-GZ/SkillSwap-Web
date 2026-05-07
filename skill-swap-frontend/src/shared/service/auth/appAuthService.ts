import { API_BASE_URL, resolveAssetUrl } from "../../../lib/api";
import type { User } from "../../../types/user";

interface ClerkEmailLike {
  emailAddress?: string | null;
}

interface ClerkUserLike {
  primaryEmailAddress?: ClerkEmailLike | null;
  emailAddresses?: ClerkEmailLike[] | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export const decodeJwtPayload = (token: string | null) => {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as { sub?: string };
  } catch (error) {
    console.warn("Failed to decode JWT payload", error);
    return null;
  }
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

const isGeneratedUsername = (value: string | null | undefined) => {
  if (!value) return true;
  const candidate = value.trim();
  if (!candidate) return true;
  return /^user([_\s-]|$)/i.test(candidate);
};

export const buildIdentityFallback = (backendUser: User, clerkUser: ClerkUserLike | null | undefined): User => {
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress?.trim() ||
    clerkUser?.emailAddresses?.[0]?.emailAddress?.trim() ||
    "";

  const fullNameCandidate = normalizeWhitespace(
    clerkUser?.fullName || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || ""
  );

  const usernameCandidate =
    (fullNameCandidate && !/^user([_\s-]|$)/i.test(fullNameCandidate) ? fullNameCandidate : "") ||
    clerkUser?.username?.trim() ||
    (primaryEmail.includes("@") ? primaryEmail.split("@")[0] : "");

  const nextEmail = backendUser.email?.trim() || primaryEmail || "";
  const nextUsername = isGeneratedUsername(backendUser.username)
    ? usernameCandidate || backendUser.username
    : backendUser.username;

  return {
    ...backendUser,
    email: nextEmail,
    username: nextUsername,
  };
};

export const detectClerkAuthError = (search: string, hash: string) => {
  const raw = `${search} ${hash}`.toLowerCase();
  const hasExternalAccountNotFound = raw.includes("external_account_not_found");
  const hasOauthError = raw.includes("oauth") && (raw.includes("error") || raw.includes("failed"));
  if (!hasExternalAccountNotFound && !hasOauthError) {
    return null;
  }
  if (hasExternalAccountNotFound) {
    return "This Google account is not linked yet. Please click Sign Up once to create and link your account, then use Sign In.";
  }
  return "Third-party sign-in did not complete. Please try again. If this is your first time with Google, click Sign Up first.";
};

export async function fetchBackendProfile(accessToken: string) {
  const url = `${API_BASE_URL}/api/v1/users/me`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch profile failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function mapBackendUser(userProfile: any): User {
  const rawAvatar = userProfile.avatarUrl || userProfile.avatar_url || userProfile.avatar || "";
  const resolvedAvatar = resolveAssetUrl(rawAvatar);
  const avatarVersion =
    userProfile.updatedAt ||
    userProfile.updated_at ||
    userProfile.avatarUpdatedAt ||
    userProfile.avatar_updated_at ||
    "";

  const avatarUrl = resolvedAvatar
    ? avatarVersion
      ? `${resolvedAvatar}${resolvedAvatar.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(avatarVersion))}`
      : resolvedAvatar
    : "";

  return {
    id: String(userProfile.id),
    email: userProfile.email,
    username: userProfile.username,
    avatarUrl,
    bio: userProfile.bio || "",
    // 积分系统已停用：默认值改为 0（保留旧默认值作为注释）。
    // creditBalance: userProfile.creditBalance ?? 100,
    creditBalance: userProfile.creditBalance ?? 0,
    skills: userProfile.skills || [],
    totalWorkshopsHosted: userProfile.totalWorkshopsHosted || 0,
    totalWorkshopsAttended: userProfile.totalWorkshopsAttended || 0,
    rating: userProfile.rating || 0,
    reviewCount: userProfile.reviewCount || 0,
    createdAt: userProfile.createdAt || new Date().toISOString(),
  };
}

export const syncFallbackUsername = async (token: string, username: string) => {
  await fetch(`${API_BASE_URL}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
};
