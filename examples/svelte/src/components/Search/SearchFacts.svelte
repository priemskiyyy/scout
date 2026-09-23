<script lang="ts">
  import {
    ACCURACY_LABELS,
    ACCURACY_MEANINGS,
    FACET_NOTES,
  } from "examples/shared/outpost/constants/labels";
  import { formatCount } from "examples/shared/outpost/formatting/formatCount";
  import { formatNextPage } from "examples/shared/outpost/formatting/formatNextPage";
  import { formatTook } from "examples/shared/outpost/formatting/formatTook";
  import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
  import type { FacetCountsNote } from "examples/shared/outpost/types/FacetCountsNote";
  import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
  import { ACCURACY_TONES } from "examples/shared/ui/constants/tones";
  import Badge from "src/components/Badge/Badge.svelte";

  type Props = { latest: StoreResult; note: FacetCountsNote };

  let { latest, note }: Props = $props();

  // Scout answers a filter that matches nothing itself, with no native response.
  const getNative = (page: StoreResult) => {
    if (page.native === null) {
      return "None: Scout answered without asking the engine";
    }

    return "The engine's whole response, under result.native";
  };

  const getSkipped = (skipped: number) => {
    if (skipped === 0) {
      return "None";
    }

    return `${formatCount(skipped, "document")} failed the schema and were dropped`;
  };
</script>

<dl class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
  <dt class="text-stone-500">Total</dt>
  <dd class="flex flex-col gap-1">
    <span class="flex flex-wrap items-center gap-2 font-medium">
      {formatTotal(latest.total)}
      <Badge tone={ACCURACY_TONES[latest.total.accuracy]}>
        {ACCURACY_LABELS[latest.total.accuracy]}
      </Badge>
    </span>
    <span class="text-stone-500">
      {ACCURACY_MEANINGS[latest.total.accuracy]}
    </span>
  </dd>
  <dt class="text-stone-500">Next page</dt>
  <dd>{formatNextPage(latest.page.next)}</dd>
  <dt class="text-stone-500">Facets</dt>
  <dd>{FACET_NOTES[note]}</dd>
  <dt class="text-stone-500">Took</dt>
  <dd>{formatTook(latest.took)}</dd>
  <dt class="text-stone-500">Skipped</dt>
  <dd>{getSkipped(latest.skipped)}</dd>
  <dt class="text-stone-500">Native</dt>
  <dd>{getNative(latest)}</dd>
</dl>
