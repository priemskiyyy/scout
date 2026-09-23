<script lang="ts" generics="T extends string | number">
  import type { Option } from "examples/shared/outpost/types/Option";
  import { PILL_CLASS_NAME } from "examples/shared/ui/styles/pillStyles";
  import { segmentStyles } from "examples/shared/ui/styles/segmentStyles";

  type Props = {
    label: string;
    options: Option<T>[];
    value: T;
    onSelect: (value: T) => void;
  };

  let { label, options, value, onSelect }: Props = $props();
</script>

<div role="group" aria-label={label} class={PILL_CLASS_NAME}>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={value === option.value}
      onclick={() => onSelect(option.value)}
      class={segmentStyles({ selected: value === option.value })}
    >
      {option.label}
    </button>
  {/each}
</div>
