import type { SearchFacet } from "@priemskiyyy/scout";
import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import type { FacetOption } from "examples/shared/outpost/types/FacetOption";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";

type FacetGroupProps = {
  title: string;
  facet: SearchFacet<string> | null;
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
};

export const FacetGroup: Component<FacetGroupProps> = (props) => (
  <fieldset class="flex flex-col gap-0.5">
    <legend class={LEGEND_CLASS_NAME}>{props.title}</legend>
    <For each={props.options}>
      {(option) => {
        const checked = () => props.selected.includes(option.value);
        const count = () => formatFacetCount(props.facet, option.value);

        return (
          <label class={checkStyles({ checked: checked() })}>
            <input
              type="checkbox"
              checked={checked()}
              onChange={() => props.onToggle(option.value)}
              class="size-4 accent-amber-600"
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <Show when={count()}>
              {(shown) => (
                <span class="font-mono text-xs text-stone-500 tabular-nums">
                  {shown()}
                </span>
              )}
            </Show>
          </label>
        );
      }}
    </For>
  </fieldset>
);
