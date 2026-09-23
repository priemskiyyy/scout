import { X } from "@phosphor-icons/react";
import type React from "react";

import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";

type ActiveFiltersProps = {
  state: StoreState;
  onRemove: (action: StoreAction) => void;
};

export const ActiveFilters: React.FunctionComponent<ActiveFiltersProps> = ({
  state,
  onRemove,
}) => {
  const filters = getActiveFilters(state);

  if (filters.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Active filters" className="flex flex-wrap gap-1.5">
      {filters.map((filter) => (
        <li key={filter.key}>
          <button
            type="button"
            aria-label={`Remove ${filter.label}`}
            onClick={() => onRemove(filter.remove)}
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 py-1 pr-2 pl-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900"
          >
            {filter.label}
            <X aria-hidden="true" size={12} weight="bold" />
          </button>
        </li>
      ))}
    </ul>
  );
};
