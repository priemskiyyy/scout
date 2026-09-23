import { Highlighter, ListNumbers } from "@phosphor-icons/react";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { formatStoreHeadline } from "examples/shared/outpost/formatting/formatStoreHeadline";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { FIELD_CLASS_NAME } from "examples/shared/ui/styles/fieldStyles";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SortName } from "examples/shared/outpost/types/SortName";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ACCURACY_LABELS } from "examples/shared/outpost/constants/labels";
import {
  PROFILE_OPTIONS,
  SORT_OPTIONS,
} from "examples/shared/outpost/constants/store";
import { ACCURACY_TONES } from "examples/shared/ui/constants/tones";

type StoreToolbarProps = {
  state: StoreState;
  latest: StoreResult | null;
  searching: boolean;
  onProfileSelect: (profile: ProfileName) => void;
  onSortSelect: (sort: SortName) => void;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
};

const isSortName = (value: string): value is SortName =>
  SORT_OPTIONS.some((option) => option.value === value);

export const StoreToolbar: React.FunctionComponent<StoreToolbarProps> = ({
  state,
  latest,
  searching,
  onProfileSelect,
  onSortSelect,
  onFacetsToggle,
  onHighlightsToggle,
}) => {
  const handleSortChange = (value: string) => {
    if (!isSortName(value)) {
      return;
    }

    onSortSelect(value);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p aria-live="polite" className="text-lg font-semibold tracking-tight">
          {formatStoreHeadline(latest, searching)}
        </p>
        {latest === null ? null : (
          <Badge tone={ACCURACY_TONES[latest.total.accuracy]}>
            {ACCURACY_LABELS[latest.total.accuracy]}
          </Badge>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          Sort
          <select
            value={state.sort}
            onChange={(event) => handleSortChange(event.target.value)}
            className={FIELD_CLASS_NAME}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Search in"
          options={PROFILE_OPTIONS}
          value={state.profile}
          onSelect={onProfileSelect}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={state.facets}
            onClick={onFacetsToggle}
            className={buttonStyles({ size: "small", pressed: state.facets })}
          >
            <ListNumbers aria-hidden="true" size={14} weight="bold" />
            Facet counts
          </button>
          <button
            type="button"
            aria-pressed={state.highlights}
            onClick={onHighlightsToggle}
            className={buttonStyles({
              size: "small",
              pressed: state.highlights,
            })}
          >
            <Highlighter aria-hidden="true" size={14} weight="bold" />
            Highlights
          </button>
        </div>
      </div>
    </div>
  );
};
