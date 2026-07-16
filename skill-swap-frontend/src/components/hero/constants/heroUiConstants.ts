export const HERO_BASE_STATS = {
  members: 50,
  skills: 25,
  workshopsFallback: 100,
} as const;

export const HERO_HOW_IT_WORKS_STEPS = [
  {
    order: "1",
    title: "Join your campus",
    description: "Create a profile and tell the community what you want to learn or share.",
  },
  {
    order: "2",
    title: "Find your next skill",
    description: "Browse practical workshops led by students and community members.",
  },
  {
    order: "3",
    title: "Share what you know",
    description: "Host a workshop and turn something you know into someone else's new skill.",
  },
  {
    order: "4",
    title: "Connect beyond class",
    description: "Meet curious people and build genuine connections across campuses.",
  },
] as const;
