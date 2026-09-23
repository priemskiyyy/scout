import { For } from "solid-js";
import type { JSX } from "solid-js";

import type { Option } from "examples/shared/outpost/types/Option";
import { PILL_CLASS_NAME } from "examples/shared/ui/styles/pillStyles";
import { segmentStyles } from "examples/shared/ui/styles/segmentStyles";

type SegmentedControlProps<T extends string | number> = {
  label: string;
  options: Option<T>[];
  value: T;
  onSelect: (value: T) => void;
};

export const SegmentedControl = <T extends string | number>(
  props: SegmentedControlProps<T>,
): JSX.Element => (
  <div role="group" aria-label={props.label} class={PILL_CLASS_NAME}>
    <For each={props.options}>
      {(option) => (
        <button
          type="button"
          aria-pressed={props.value === option.value}
          onClick={() => props.onSelect(option.value)}
          class={segmentStyles({ selected: props.value === option.value })}
        >
          {option.label}
        </button>
      )}
    </For>
  </div>
);
