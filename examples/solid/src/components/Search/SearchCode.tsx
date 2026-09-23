import clsx from "clsx";
import { For } from "solid-js";
import type { Component } from "solid-js";

import type { CodeToken } from "examples/shared/outpost/types/CodeToken";
import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";

type SearchCodeProps = { code: string };

const TOKEN_CLASS_NAMES: Record<CodeToken["kind"], string> = {
  string: "text-amber-300",
  call: "text-sky-300",
  plain: "",
};

export const SearchCode: Component<SearchCodeProps> = (props) => (
  <pre
    aria-label="The search, as code"
    class={clsx("rounded-xl", CODE_BLOCK_CLASS_NAME)}
  >
    <For each={getCodeTokens(props.code)}>
      {(token) => (
        <span class={TOKEN_CLASS_NAMES[token.kind]}>{token.text}</span>
      )}
    </For>
  </pre>
);
