import { Fingerprint } from "@phosphor-icons/react";
import type React from "react";

import { KeyComparisonCard } from "src/components/Identity/KeyComparisonCard";
import { Panel } from "src/components/Panel/Panel";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import { getKeyComparisons } from "examples/shared/outpost/utils/getKeyComparisons";

type IdentityPanelProps = { runtime: OutpostRuntime };

export const IdentityPanel: React.FunctionComponent<IdentityPanelProps> = ({
  runtime,
}) => (
  <Panel
    title="Query identity"
    icon={Fingerprint}
    shows="builder.key() is the search's canonical identity, and the store's TanStack Query key. Two searches that mean the same thing share it, and two that differ in anything that changes results do not."
    aside={null}
  >
    <ul className="grid gap-3 lg:grid-cols-3">
      {getKeyComparisons(runtime).map((comparison) => (
        <KeyComparisonCard key={comparison.title} comparison={comparison} />
      ))}
    </ul>
  </Panel>
);
