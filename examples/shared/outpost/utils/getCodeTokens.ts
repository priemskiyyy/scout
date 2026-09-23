import type { CodeToken } from "examples/shared/outpost/types/CodeToken";

const STRING = /("(?:[^"\\]|\\.)*")/;
const CALL = /(\.[A-Za-z]+)(?=\()/;

/**
 * The code split into strings, method calls and the rest, which is all the
 * tinting a builder chain needs.
 *
 * @example
 * ```ts
 * getCodeTokens('.search("tent")');
 * // [{ text: ".search", kind: "call" }, { text: "(", kind: "plain" }, ...]
 * ```
 */
export const getCodeTokens = (code: string): CodeToken[] =>
  code.split(STRING).flatMap((chunk, index): CodeToken[] => {
    // A split keeps the captured strings at the odd positions.
    if (index % 2 === 1) {
      return [{ text: chunk, kind: "string" }];
    }

    return chunk
      .split(CALL)
      .map((part, position): CodeToken => {
        if (position % 2 === 1) {
          return { text: part, kind: "call" };
        }

        return { text: part, kind: "plain" };
      })
      .filter((token) => token.text !== "");
  });
