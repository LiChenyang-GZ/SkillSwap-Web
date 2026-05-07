export const getUserInitials = (username: string) => {
  return username
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((namePart) => namePart.charAt(0))
    .join("");
};
