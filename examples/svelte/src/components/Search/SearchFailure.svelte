<script lang="ts">
  import { ScoutError } from "@priemskiyyy/scout";
  import { ERROR_MEANINGS } from "examples/shared/outpost/constants/labels";
  import { formatError } from "examples/shared/outpost/formatting/formatError";
  import { ERROR_TONES } from "examples/shared/ui/constants/tones";
  import Badge from "src/components/Badge/Badge.svelte";

  type Props = { error: Error };

  let { error }: Props = $props();
</script>

{#if !(error instanceof ScoutError)}
  <p class="text-sm">{formatError(error)}</p>
{:else}
  <dl class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
    <dt class="text-stone-500">Code</dt>
    <dd class="flex flex-col items-start gap-1">
      <Badge tone={ERROR_TONES[error.code]}>{error.code}</Badge>
      <span class="text-stone-500">{ERROR_MEANINGS[error.code]}</span>
    </dd>
    <dt class="text-stone-500">Message</dt>
    <dd class="break-words">{error.message}</dd>
    {#if error.cause !== undefined}
      <dt class="text-stone-500">Cause</dt>
      <dd class="break-words">{formatError(error.cause)}</dd>
    {/if}
  </dl>
{/if}
