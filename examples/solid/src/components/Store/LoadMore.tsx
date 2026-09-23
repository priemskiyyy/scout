import { Show } from "solid-js";
import type { Component } from "solid-js";

import { formatShown } from "examples/shared/outpost/formatting/formatShown";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";

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

export const LoadMore: Component<LoadMoreProps> = (props) => {
  const hint = () => getHint(props.latest.page.next);

  return (
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Show when={props.latest.page.next !== null}>
        <button
          type="button"
          disabled={props.loading}
          onClick={() => props.onPress()}
          class={buttonStyles()}
        >
          <Show
            when={props.loading}
            fallback={<BaseIcon src={ICONS.arrowDown} size="regular" />}
          >
            <BaseIcon
              src={ICONS.circleNotch}
              size="regular"
              class="animate-spin"
            />
          </Show>
          Load more
        </button>
      </Show>
      <p class="text-sm text-stone-500">
        {formatShown(props.shown, props.latest.total)}
        <Show when={hint()}>
          {(text) => <span class="block">{text()}</span>}
        </Show>
      </p>
    </div>
  );
};
