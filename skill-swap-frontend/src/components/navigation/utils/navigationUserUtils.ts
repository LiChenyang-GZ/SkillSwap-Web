export const getUserInitials = (username: string) => {
  return username
    .split(" ")
    .map((namePart) => namePart[0])
    .join("");
};
