import clsx from "clsx";
import type React from "react";

import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import type { CodeToken } from "examples/shared/outpost/types/CodeToken";
import { getCodeTokens } from "examples/shared/outpost/utils/getCodeTokens";

type SearchCodeProps = { code: string };

const TOKEN_CLASS_NAMES: Record<CodeToken["kind"], string> = {
  string: "text-amber-300",
  call: "text-sky-300",
  plain: "",
};

export const SearchCode: React.FunctionComponent<SearchCodeProps> = ({
  code,
}) => (
  <pre
    aria-label="The search, as code"
    className={clsx("rounded-xl", CODE_BLOCK_CLASS_NAME)}
  >
    {getCodeTokens(code).map((token, index) => (
      <span key={index} className={TOKEN_CLASS_NAMES[token.kind]}>
        {token.text}
      </span>
    ))}
  </pre>
);
