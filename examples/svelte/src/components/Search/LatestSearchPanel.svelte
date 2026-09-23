<script lang="ts">
  import type { QueryKey } from "@tanstack/svelte-query";
  import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
  import { formatJson } from "examples/shared/outpost/formatting/formatJson";
  import { formatSearchCode } from "examples/shared/outpost/formatting/formatSearchCode";
  import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
  import type { StoreState } from "examples/shared/outpost/types/StoreState";
  import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
  import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
  import { ICONS } from "examples/shared/ui/constants/icons";
  import { STATUS_TONES } from "examples/shared/ui/constants/tones";
  import Badge from "src/components/Badge/Badge.svelte";
  import CodeDetails from "src/components/Code/CodeDetails.svelte";
  import Panel from "src/components/Panel/Panel.svelte";
  import SearchCode from "src/components/Search/SearchCode.svelte";
  import SearchFacts from "src/components/Search/SearchFacts.svelte";
  import SearchFailure from "src/components/Search/SearchFailure.svelte";
  import type { StoreQuery } from "src/types/StoreQuery";

  type Props = {
    storeState: StoreState;
    query: StoreQuery;
    queryKey: QueryKey;
    status: SearchStatus;
  };

  let { storeState, query, queryKey, status }: Props = $props();

  const latest = $derived(getLatestPage(query));
</script>

{#snippet statusBadge()}
  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
{/snippet}

<Panel
  title="Latest search"
  icon={ICONS.binoculars}
  shows="The search the store just ran: the code that built it, what came back, and how sure the engine was."
  aside={statusBadge}
>
  <SearchCode code={formatSearchCode(storeState.engine, storeState)} />
  {#if query.error !== null}
    <SearchFailure error={query.error} />
  {:else if latest === null}
    <p class="text-sm text-stone-500">Waiting for the engine…</p>
  {:else}
    <!-- Keyed by the page, so each new answer mounts afresh and flashes. -->
    {#key query.dataUpdatedAt}
      <div
        class="-m-2 flex animate-flash flex-col gap-3 rounded-xl p-2 motion-reduce:animate-none"
      >
        <SearchFacts {latest} note={getFacetCountsNote(storeState, latest)} />
        <CodeDetails
          summary="The latest page, with its first two hits"
          label="The latest page"
          code={formatJson({ ...latest, hits: latest.hits.slice(0, 2) })}
        />
      </div>
    {/key}
  {/if}
  <CodeDetails
    summary="Its query key"
    label="Query key"
    code={formatJson(queryKey)}
  />
</Panel>
