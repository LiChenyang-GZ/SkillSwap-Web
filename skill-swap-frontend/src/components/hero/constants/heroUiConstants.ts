export const HERO_BASE_STATS = {
  members: "1,000+",
  swaps: "20+",
  campuses: "3",
} as const;

export const HERO_LEARNER_STEPS = [
  {
    order: "01",
    title: "Follow your curiosity",
    description: "Browse swaps led by students who remember what it felt like to be a beginner.",
  },
  {
    order: "02",
    title: "Show up as you are",
    description: "Bring a question, meet a small group, and learn by trying things together.",
  },
] as const;

export const HERO_HOST_STEPS = [
  {
    order: "01",
    title: "Start with one thing",
    description: "Choose something you enjoy and can help another student try for the first time.",
  },
  {
    order: "02",
    title: "We help make it happen",
    description: "Shape a friendly session, welcome your group, and share it in your own way.",
  },
] as const;
