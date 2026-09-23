<script setup lang="ts">
import { computed } from "vue";

import type { CodeToken } from "examples/shared/outpost/types/CodeToken";
import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";

const props = defineProps<{ code: string }>();

const TOKEN_CLASS_NAMES: Record<CodeToken["kind"], string> = {
  string: "text-amber-300",
  call: "text-sky-300",
  plain: "",
};

const tokens = computed(() => getCodeTokens(props.code));
</script>

<template>
  <pre
    aria-label="The search, as code"
    :class="['rounded-xl', CODE_BLOCK_CLASS_NAME]"
  ><span
    v-for="(token, index) in tokens"
    :key="index"
    :class="TOKEN_CLASS_NAMES[token.kind]"
  >{{ token.text }}</span></pre>
</template>
