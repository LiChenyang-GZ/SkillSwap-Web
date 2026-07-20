import { HERO_BASE_STATS } from "../../hero/constants/heroUiConstants";

export interface CampusStop {
  id: string;
  shortName: string;
  name: string;
  status: "established" | "upcoming";
  statusLabel: string;
  description: string;
}

export const CAMPUS_ROLLOUT: readonly CampusStop[] = [
  {
    id: "usyd",
    shortName: "USYD",
    name: "University of Sydney",
    status: "established",
    statusLabel: "Where it all started",
    description:
      "Our home campus, where students have been swapping skills, hosting sessions, and building the community from day one.",
  },
  {
    id: "uts",
    shortName: "UTS",
    name: "University of Technology Sydney",
    status: "upcoming",
    statusLabel: "Next on the map",
    description:
      "SkillSwap has not launched at UTS yet. We are looking for curious students who want to help shape what it becomes here.",
  },
  {
    id: "unsw",
    shortName: "UNSW",
    name: "University of New South Wales",
    status: "upcoming",
    statusLabel: "Next on the map",
    description:
      "SkillSwap has not launched at UNSW yet. The first swaps happen when the first students say yes — maybe that is you.",
  },
] as const;

export const CAMPUS_USYD_STATS = [
  { value: HERO_BASE_STATS.members, label: "USYD members" },
  { value: HERO_BASE_STATS.swaps, label: "SkillSwaps so far" },
] as const;
