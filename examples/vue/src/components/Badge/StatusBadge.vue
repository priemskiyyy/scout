<script setup lang="ts">
import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import ToneBadge from "src/components/Badge/ToneBadge.vue";

defineProps<{ status: SearchStatus }>();
</script>

<template>
  <ToneBadge :tone="STATUS_TONES[status]">
    <span
      aria-hidden="true"
      :class="dotStyles({ tone: STATUS_TONES[status] })"
    />
    {{ STATUS_LABELS[status] }}
  </ToneBadge>
</template>
