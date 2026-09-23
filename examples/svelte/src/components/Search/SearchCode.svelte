<script lang="ts">
  import type { CodeToken } from "examples/shared/outpost/types/CodeToken";
  import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";
  import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";

  type Props = { code: string };

  let { code }: Props = $props();

  const TOKEN_CLASS_NAMES: Record<CodeToken["kind"], string> = {
    string: "text-amber-300",
    call: "text-sky-300",
    plain: "",
  };

  const tokens = $derived(getCodeTokens(code));
</script>

<pre
  aria-label="The search, as code"
  class={[
    "rounded-xl",
    CODE_BLOCK_CLASS_NAME,
  ]}>{#each tokens as token, index (index)}<span
      class={TOKEN_CLASS_NAMES[token.kind]}>{token.text}</span
    >{/each}</pre>
