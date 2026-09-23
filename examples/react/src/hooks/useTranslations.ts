import { useEffect, useState } from "react";

import { translateSearch } from "examples/shared/outpost/dialects/translateSearch";
import type { DialectId } from "examples/shared/outpost/types/DialectId";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import type { Translation } from "examples/shared/outpost/types/Translation";
import type { TranslationVariant } from "examples/shared/outpost/types/TranslationVariant";

/** The store's search in every dialect, recomputed whenever it changes. */
export const useTranslations = (
  state: StoreState,
  variant: TranslationVariant,
) => {
  const [translations, setTranslations] = useState<Record<
    DialectId,
    Translation
  > | null>(null);

  useEffect(() => {
    let current = true;

    translateSearch(state, variant)
      .then((next) => {
        if (!current) {
          return;
        }

        setTranslations(next);
      })
      .catch(() => {});

    return () => {
      current = false;
    };
  }, [state, variant]);

  return translations;
};
