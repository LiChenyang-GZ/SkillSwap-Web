import { API_BASE_URL } from "../../../lib/api";

export interface UserProfileUpdatesPayload {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
}

const parseApiErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
  const raw = await response.text();
  let message = raw;

  try {
    const parsed = JSON.parse(raw);
    message = parsed?.message || parsed?.error || raw;
  } catch {
    // Keep raw response text when not JSON.
  }

  const normalized = typeof message === "string" ? message.trim() : "";
  const lower = normalized.toLowerCase();

  if (
    response.status === 413 ||
    lower.includes("maximum upload size") ||
    lower.includes("size exceeds") ||
    lower.includes("payload too large")
  ) {
    return "Image is too large. Please upload an image up to 10MB.";
  }

  const cleaned = normalized
    .replace(/^an unexpected error occurred:\s*/i, "")
    .replace(/\s+caused by:.*/i, "")
    .trim();

  return cleaned || fallbackMessage;
};

const authenticatedFetch = async <T>(url: string, options: RequestInit, fallbackMessage: string): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const fallbackWithStatus = `${fallbackMessage} (${response.status}).`;
    const message = await parseApiErrorMessage(response, fallbackWithStatus);
    throw new Error(message || fallbackWithStatus);
  }

  const raw = await response.text();
  if (!raw) {
    return undefined as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
};

export const userProfileService = {
  updateCurrentUserProfile: async <T>(
    updates: UserProfileUpdatesPayload,
    token: string
  ): Promise<T> => {
    return authenticatedFetch<T>(
      `${API_BASE_URL}/api/v1/users/me`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      },
      "Failed to update profile."
    );
  },

  uploadCurrentUserAvatar: async <T>(file: File, token: string): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);

    return authenticatedFetch<T>(
      `${API_BASE_URL}/api/v1/users/me/avatar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
      "Failed to upload avatar."
    );
  },
};
