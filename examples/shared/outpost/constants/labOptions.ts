import type { Option } from "examples/shared/outpost/types/Option";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";

export const LATENCY_OPTIONS: Option<number>[] = [
  { value: 0, label: "0 ms" },
  { value: 400, label: "400 ms" },
  { value: 1_500, label: "1.5 s" },
];

export const VALIDATION_OPTIONS: Option<ValidationMode>[] = [
  { value: "error", label: "Fail the search" },
  { value: "skip", label: "Skip and count them" },
];
