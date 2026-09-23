import { Translate } from "@phosphor-icons/react";
import type React from "react";
import { useId, useState } from "react";

import { Badge } from "src/components/Badge/Badge";
import { TranslationView } from "src/components/Engines/TranslationView";
import { Panel } from "src/components/Panel/Panel";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { useTranslations } from "src/hooks/useTranslations";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import { navLinkStyles } from "examples/shared/ui/styles/navLinkStyles";
import type { DialectId } from "examples/shared/outpost/types/DialectId";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import type { TranslationVariant } from "examples/shared/outpost/types/TranslationVariant";
import {
  DIALECT_GUIDES,
  DIALECT_IDS,
  VARIANT_GUIDES,
  VARIANT_OPTIONS,
} from "examples/shared/outpost/constants/dialects";
import { DIALECT_ICONS } from "src/utils/constants/icons";
import { TRANSLATION_LABELS } from "examples/shared/outpost/constants/labels";
import { TRANSLATION_TONES } from "examples/shared/ui/constants/tones";

type DialectsPanelProps = { state: StoreState };

export const DialectsPanel: React.FunctionComponent<DialectsPanelProps> = ({
  state,
}) => {
  const [variant, setVariant] = useState<TranslationVariant>("store");
  const [dialect, setDialect] = useState<DialectId>("typesense");
  const translations = useTranslations(state, variant);
  const panelId = useId();
  const guide = DIALECT_GUIDES[dialect];
  const translation = translations?.[dialect];
  const DialectIcon = DIALECT_ICONS[dialect];

  return (
    <Panel
      title="Six more dialects"
      icon={Translate}
      shows="The same search, handed to six more adapters over clients that record what they were given and answer with nothing. Nothing is sent anywhere."
      aside={null}
    >
      <div className="flex flex-col gap-2">
        <SegmentedControl
          label="Translate"
          options={VARIANT_OPTIONS}
          value={variant}
          onSelect={setVariant}
        />
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {VARIANT_GUIDES[variant].description}
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Dialects"
        className="flex gap-1 overflow-x-auto pb-1"
      >
        {DIALECT_IDS.map((id) => {
          const TabIcon = DIALECT_ICONS[id];
          const kind = translations?.[id].kind;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={dialect === id}
              aria-controls={panelId}
              onClick={() => setDialect(id)}
              className={navLinkStyles({
                current: dialect === id,
                className: "inline-flex items-center gap-1.5",
              })}
            >
              <TabIcon aria-hidden="true" size={14} weight="bold" />
              {DIALECT_GUIDES[id].name}
              {kind === undefined ? null : (
                <span
                  aria-hidden="true"
                  className={dotStyles({ tone: TRANSLATION_TONES[kind] })}
                />
              )}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <DialectIcon
            aria-hidden="true"
            size={18}
            weight="duotone"
            className="text-amber-600 dark:text-amber-400"
          />
          <span className="font-semibold">{guide.name}</span>
          <span className="font-mono text-xs text-stone-500">
            {guide.packageName}
          </span>
          {translation === undefined ? null : (
            <Badge tone={TRANSLATION_TONES[translation.kind]}>
              {TRANSLATION_LABELS[translation.kind]}
            </Badge>
          )}
          <span className="basis-full font-mono text-xs break-all text-stone-500">
            {guide.call}
          </span>
        </div>
        {translation === undefined ? (
          <p className="text-sm text-stone-500">Translating…</p>
        ) : (
          <TranslationView guide={guide} translation={translation} />
        )}
      </div>
    </Panel>
  );
};
