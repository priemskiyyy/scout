import { Prohibit, WarningCircle } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { EmptyState } from "src/components/EmptyState/EmptyState";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import type { DialectGuide } from "examples/shared/outpost/types/DialectGuide";
import type { Translation } from "examples/shared/outpost/types/Translation";

type TranslationViewProps = { guide: DialectGuide; translation: Translation };

export const TranslationView: React.FunctionComponent<TranslationViewProps> = ({
  guide,
  translation,
}) => {
  if (translation.kind === "answered-by-scout") {
    return (
      <EmptyState
        icon={Prohibit}
        title="Scout answered, and no adapter was asked"
        description="The filter matches nothing, so the core answered with an exact total of zero before any adapter saw the search."
      />
    );
  }

  if (translation.kind === "refused") {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-yellow-300 bg-yellow-50/60 p-4 text-sm dark:border-yellow-900 dark:bg-yellow-950/20">
        <p className="flex items-center gap-2 font-semibold">
          <Prohibit aria-hidden="true" size={18} weight="duotone" />
          {guide.name} refused before its client was called
        </p>
        <p className="font-mono leading-relaxed break-words">
          {translation.message}
        </p>
      </div>
    );
  }

  if (translation.kind === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <WarningCircle aria-hidden="true" size={18} weight="duotone" />
        {translation.message}
      </div>
    );
  }

  return (
    <pre
      aria-label={`What ${guide.name} was handed`}
      className={clsx("max-h-[28rem] rounded-xl", CODE_BLOCK_CLASS_NAME)}
    >
      {formatJson(translation.request)}
    </pre>
  );
};
