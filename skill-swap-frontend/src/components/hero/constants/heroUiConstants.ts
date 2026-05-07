export const HERO_BASE_STATS = {
  members: 50,
  skills: 25,
  workshopsFallback: 100,
} as const;

export const HERO_HOW_IT_WORKS_STEPS = [
  {
    order: "1",
    title: "Sign Up",
    description: "Create your account with email and start exploring in minutes",
  },
  {
    order: "2",
    title: "Learn Skills",
    description: "Attend workshops and learn directly from community experts",
  },
  {
    order: "3",
    title: "Teach Others",
    description: "Host workshops in your area of expertise and help others grow",
  },
  {
    order: "4",
    title: "Grow Together",
    description: "Build connections and expand your skillset within our community",
  },
] as const;
