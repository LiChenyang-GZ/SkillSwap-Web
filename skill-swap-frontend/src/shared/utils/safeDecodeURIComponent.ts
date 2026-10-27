export function safeDecodeURIComponent(value: string): string {
  // decodeURIComponent throws on malformed escapes such as "%E0%A4%A" or a lone "%"; route parsing runs
  // during the first render, so a truncated shared link would otherwise crash the whole app.
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
