import type { HighlightFragment } from "@priemskiyyy/scout";
import { For, Show } from "solid-js";
import type { Component } from "solid-js";

type HighlightedTextProps = {
  fragments: readonly HighlightFragment[] | null;
  text: string;
};

/**
 * A highlighted value, drawn from Scout's parts. A part is text, never
 * markup, so a document that carries a tag shows the tag.
 */
export const HighlightedText: Component<HighlightedTextProps> = (props) => (
  <Show when={props.fragments?.[0]} fallback={props.text}>
    {(fragment) => (
      <For each={fragment().parts}>
        {(part) => (
          <Show when={part.matched} fallback={part.text}>
            <mark class="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30">
              {part.text}
            </mark>
          </Show>
        )}
      </For>
    )}
  </Show>
);
