<script lang="ts">
  import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
  import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
  import { STATUS_TONES } from "examples/shared/ui/constants/tones";
  import { dotStyles } from "examples/shared/ui/styles/dotStyles";
  import Badge from "src/components/Badge/Badge.svelte";

  type Props = { status: SearchStatus };

  let { status }: Props = $props();
</script>

<!-- How the store's search stands, in the header, wherever the reader is. -->
<Badge tone={STATUS_TONES[status]}>
  <span aria-hidden="true" class={dotStyles({ tone: STATUS_TONES[status] })}
  ></span>
  {STATUS_LABELS[status]}
</Badge>
