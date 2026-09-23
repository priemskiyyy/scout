<script lang="ts">
  import type { Snippet } from "svelte";
  import { ICONS } from "examples/shared/ui/constants/icons";
  import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
  import {
    codeBlockStyles,
    detailsStyles,
    summaryStyles,
  } from "examples/shared/ui/styles/detailsStyles";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";

  type Props = {
    summary: string;
    label: string;
    badge?: Snippet;
    code: string;
    variant?: "boxed" | "quiet";
  };

  let { summary, label, badge, code, variant = "boxed" }: Props = $props();
</script>

<!-- A closed block of code or JSON that opens on demand. -->
<details class={detailsStyles({ variant })}>
  <summary class={summaryStyles({ variant })}>
    <BaseIcon
      src={ICONS.caretRight}
      size="small"
      class="text-stone-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
    />
    {summary}
    {#if badge !== undefined}
      {@render badge()}
    {/if}
  </summary>
  <pre
    aria-label={label}
    class={[codeBlockStyles({ variant }), CODE_BLOCK_CLASS_NAME]}>{code}</pre>
</details>
