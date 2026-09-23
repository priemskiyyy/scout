import {
  Bug,
  Flask,
  Power,
  Prohibit,
  ShieldWarning,
  Skull,
  SmileyXEyes,
  WifiSlash,
  WifiX,
} from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { LabControl } from "src/components/Lab/LabControl";
import { LabField } from "src/components/Lab/LabField";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { useValueStore } from "src/hooks/useValueStore";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";
import {
  LATENCY_OPTIONS,
  VALIDATION_OPTIONS,
} from "examples/shared/outpost/constants/labOptions";

type LabPanelProps = {
  backend: CatalogueBackend;
  validate: ValidationMode;
  disposed: boolean;
  emptySet: boolean;
  onValidateSelect: (validate: ValidationMode) => void;
  onEmptySetToggle: () => void;
  onDisposePress: () => void;
};

export const LabPanel: React.FunctionComponent<LabPanelProps> = ({
  backend,
  validate,
  disposed,
  emptySet,
  onValidateSelect,
  onEmptySetToggle,
  onDisposePress,
}) => {
  const state = useValueStore(backend.state);
  const failNext = useValueStore(backend.failNext);

  return (
    <section
      aria-label="Lab"
      className={clsx(
        "flex h-full min-w-0 flex-col gap-5 border-dashed p-5",
        CARD_CLASS_NAME,
      )}
    >
      <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-stone-800 dark:text-stone-200">
        <Flask
          aria-hidden="true"
          size={18}
          weight="duotone"
          className="text-amber-600 dark:text-amber-400"
        />
        Lab
      </h3>
      <LabField label="API latency">
        <SegmentedControl
          label="API latency"
          options={LATENCY_OPTIONS}
          value={state.latency}
          onSelect={(latency) => backend.update({ latency })}
        />
      </LabField>
      <LabField label="Invalid documents">
        <SegmentedControl
          label="Invalid documents"
          options={VALIDATION_OPTIONS}
          value={validate}
          onSelect={onValidateSelect}
        />
      </LabField>
      <ul className="grid gap-3 sm:grid-cols-2">
        <LabControl
          icon={WifiSlash}
          label="API offline"
          description="Your API answers 503. The search fails as provider, with the 503 kept as its cause, after the one retry this page allows."
          pressed={state.offline}
          onPress={() => backend.update({ offline: !state.offline })}
        />
        <LabControl
          icon={Bug}
          label="Fail next request"
          description="The next request answers 503 once. TanStack Query retries it, as this page configured, and the retry answers."
          pressed={failNext}
          onPress={() => backend.failNext.set(true)}
        />
        <LabControl
          icon={Prohibit}
          label="Refuse highlights"
          description="Your API answers a highlighted search with a refusal, which reaches the store as unsupported-feature."
          pressed={state.refuseHighlights}
          onPress={() =>
            backend.update({ refuseHighlights: !state.refuseHighlights })
          }
        />
        <LabControl
          icon={ShieldWarning}
          label="Corrupt a document"
          description="The first hit's price becomes a string. The Zod schema catches it: the search fails, or skips the hit and counts it."
          pressed={state.corruptDocument}
          onPress={() =>
            backend.update({ corruptDocument: !state.corruptDocument })
          }
        />
        <LabControl
          icon={Skull}
          label="Plant a hostile document"
          description="A tent whose name holds an img tag and whose copy holds a script. Its highlights are parts, so the markup shows as text."
          pressed={state.hostileDocument}
          onPress={() =>
            backend.update({ hostileDocument: !state.hostileDocument })
          }
        />
        <LabControl
          icon={WifiX}
          label="Ignore aborts"
          description="Your client stops passing the signal on. Stop a slow search: Scout settles it at once, and your API keeps working for nobody."
          pressed={state.ignoreAborts}
          onPress={() => backend.update({ ignoreAborts: !state.ignoreAborts })}
        />
        <LabControl
          icon={SmileyXEyes}
          label="Ask for an empty set"
          description="Adds brand in nothing to the filter. Scout knows that matches nothing, answers on its own, and sends no request."
          pressed={emptySet}
          onPress={onEmptySetToggle}
        />
        <LabControl
          icon={Power}
          label="Dispose Scout"
          description="Everything in flight settles as disposed, and every new search is refused until the store restarts Scout."
          pressed={disposed}
          onPress={onDisposePress}
        />
      </ul>
    </section>
  );
};
