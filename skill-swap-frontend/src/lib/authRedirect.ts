const DEFAULT_AUTH_REDIRECT_PATH = '/explore';

function normalizeConfiguredRedirect(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = DEFAULT_AUTH_REDIRECT_PATH;
    }
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

export function getAuthRedirectUrl(): string {
  const configured = normalizeConfiguredRedirect(import.meta.env.VITE_AUTH_REDIRECT_URL || '');
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${DEFAULT_AUTH_REDIRECT_PATH}`;
  }

  return `http://localhost:5173${DEFAULT_AUTH_REDIRECT_PATH}`;
}
