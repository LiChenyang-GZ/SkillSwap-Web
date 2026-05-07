export function getMemoryErrorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: number }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

export function getMemoryErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error) || !error.message) {
    return null;
  }

  const raw = error.message.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string };
    return parsed.message || parsed.error || raw;
  } catch {
    return raw;
  }
}
