import type { SearchFacet } from "@priemskiyyy/scout";
import type React from "react";

import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";
import type { FacetOption } from "examples/shared/outpost/types/FacetOption";

type FacetGroupProps = {
  title: string;
  facet: SearchFacet<string> | null;
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
};

export const FacetGroup: React.FunctionComponent<FacetGroupProps> = ({
  title,
  facet,
  options,
  selected,
  onToggle,
}) => (
  <fieldset className="flex flex-col gap-0.5">
    <legend className={LEGEND_CLASS_NAME}>{title}</legend>
    {options.map((option) => {
      const checked = selected.includes(option.value);
      const count = formatFacetCount(facet, option.value);

      return (
        <label key={option.value} className={checkStyles({ checked })}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(option.value)}
            className="size-4 accent-amber-600"
          />
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          {count === null ? null : (
            <span className="font-mono text-xs text-stone-500 tabular-nums">
              {count}
            </span>
          )}
        </label>
      );
    })}
  </fieldset>
);
