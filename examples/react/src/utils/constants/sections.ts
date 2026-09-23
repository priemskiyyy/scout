import type { Section } from "src/types/Section";
import type { SectionId } from "src/types/SectionId";

export const SECTIONS: Record<SectionId, Section> = {
  store: { number: 1, title: "Search the store", label: "Try it" },
  engines: {
    number: 2,
    title: "One declaration, ten engines",
    label: "Engines",
  },
  numbers: { number: 3, title: "Numbers you can trust", label: "Numbers" },
  lab: { number: 4, title: "Break the engine", label: "Lab" },
  identity: { number: 5, title: "Same search, same key", label: "Identity" },
  timeline: { number: 6, title: "Watch it happen", label: "Timeline" },
};

export const SECTION_IDS: SectionId[] = [
  "store",
  "engines",
  "numbers",
  "lab",
  "identity",
  "timeline",
];
