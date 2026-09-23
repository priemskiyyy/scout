import { ArrowDown, CircleNotch } from "@phosphor-icons/react";
import type React from "react";

import { formatShown } from "examples/shared/outpost/formatting/formatShown";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

type LoadMoreProps = {
  shown: number;
  latest: StoreResult;
  loading: boolean;
  onPress: () => void;
};

// What the core derived about the next page decides what the list says.
const getHint = (next: StoreResult["page"]["next"]) => {
  if (next === "unknown") {
    return "The count cannot say whether there is more, so the list asks for another page.";
  }

  if (next === null) {
    return "That is the last page the engine can serve.";
  }

  return null;
};

export const LoadMore: React.FunctionComponent<LoadMoreProps> = ({
  shown,
  latest,
  loading,
  onPress,
}) => {
  const hint = getHint(latest.page.next);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {latest.page.next === null ? null : (
        <button
          type="button"
          disabled={loading}
          onClick={onPress}
          className={buttonStyles()}
        >
          {loading ? (
            <CircleNotch
              aria-hidden="true"
              size={16}
              weight="bold"
              className="animate-spin"
            />
          ) : (
            <ArrowDown aria-hidden="true" size={16} weight="bold" />
          )}
          Load more
        </button>
      )}
      <p className="text-sm text-stone-500">
        {formatShown(shown, latest.total)}
        {hint === null ? null : <span className="block">{hint}</span>}
      </p>
    </div>
  );
};
