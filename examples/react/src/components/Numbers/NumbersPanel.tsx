import { Scales } from "@phosphor-icons/react";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { LabField } from "src/components/Lab/LabField";
import { ClaimCard } from "src/components/Numbers/ClaimCard";
import { ClaimLegend } from "src/components/Numbers/ClaimLegend";
import { Panel } from "src/components/Panel/Panel";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { formatNextPage } from "examples/shared/outpost/formatting/formatNextPage";
import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import { useValueStore } from "src/hooks/useValueStore";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import {
  ACCURACY_LABELS,
  ACCURACY_MEANINGS,
  ACCURACY_ORDER,
} from "examples/shared/outpost/constants/labels";
import {
  COUNTING_OPTIONS,
  FACET_CLAIM_LABELS,
  FACET_CLAIM_MEANINGS,
  FACET_CLAIM_ORDER,
  FACET_COUNTING_OPTIONS,
  NEXT_PAGE_LABELS,
  NEXT_PAGE_MEANINGS,
  NEXT_PAGE_ORDER,
  PAGING_OPTIONS,
} from "examples/shared/outpost/constants/numbers";
import { getFacetClaim } from "examples/shared/outpost/utils/getFacetClaim";
import { getNextPageKind } from "examples/shared/outpost/utils/getNextPageKind";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";

type NumbersPanelProps = {
  backend: CatalogueBackend;
  engine: EngineId;
  latest: StoreResult | null;
  onUseApiPress: () => void;
};

// What each card says before any page has come back.
const getPageClaims = (latest: StoreResult | null) => {
  if (latest === null) {
    return { total: "…", accuracy: null, next: "…", nextKind: null };
  }

  return {
    total: formatTotal(latest.total),
    accuracy: latest.total.accuracy,
    next: formatNextPage(latest.page.next),
    nextKind: getNextPageKind(latest.page.next),
  };
};

const getBrandClaim = (latest: StoreResult | null) => {
  if (latest === null) {
    return { value: "…", current: null };
  }

  const brand = getRequestedFacet(latest, "brand");

  if (brand === null) {
    return { value: "Not asked for", current: null };
  }

  const claim = getFacetClaim(brand);

  return { value: FACET_CLAIM_LABELS[claim], current: claim };
};

export const NumbersPanel: React.FunctionComponent<NumbersPanelProps> = ({
  backend,
  engine,
  latest,
  onUseApiPress,
}) => {
  const state = useValueStore(backend.state);
  const claims = getPageClaims(latest);
  const brand = getBrandClaim(latest);

  return (
    <Panel
      title="What the numbers claim"
      icon={Scales}
      shows="Every number the store shows says how sure the engine was, and the core derives the next page from it. Change how your API counts, and the claims change with it."
      aside={
        engine === "api" ? null : (
          <button
            type="button"
            onClick={onUseApiPress}
            className={buttonStyles({ size: "small" })}
          >
            Search the store with Your API
          </button>
        )
      }
    >
      <div className="flex flex-col gap-3 rounded-xl bg-stone-100/70 p-4 dark:bg-stone-800/40">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Your API</Badge>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            These switch how your API answers. The in-page engines always count
            exactly.
          </span>
        </div>
        <LabField label="It counts matches">
          <SegmentedControl
            label="It counts matches"
            options={COUNTING_OPTIONS}
            value={state.counting}
            onSelect={(counting) => backend.update({ counting })}
          />
        </LabField>
        <LabField label="It counts facets over">
          <SegmentedControl
            label="It counts facets over"
            options={FACET_COUNTING_OPTIONS}
            value={state.facetCounting}
            onSelect={(facetCounting) => backend.update({ facetCounting })}
          />
        </LabField>
        <LabField label="It pages through">
          <SegmentedControl
            label="It pages through"
            options={PAGING_OPTIONS}
            value={state.paging}
            onSelect={(paging) => backend.update({ paging })}
          />
        </LabField>
      </div>
      <ul className="grid gap-3 lg:grid-cols-3">
        <ClaimCard title="Total" value={claims.total}>
          <ClaimLegend
            order={ACCURACY_ORDER}
            labels={ACCURACY_LABELS}
            meanings={ACCURACY_MEANINGS}
            current={claims.accuracy}
          />
        </ClaimCard>
        <ClaimCard title="Next page" value={claims.next}>
          <ClaimLegend
            order={NEXT_PAGE_ORDER}
            labels={NEXT_PAGE_LABELS}
            meanings={NEXT_PAGE_MEANINGS}
            current={claims.nextKind}
          />
        </ClaimCard>
        <ClaimCard title="Brand facet" value={brand.value}>
          <ClaimLegend
            order={FACET_CLAIM_ORDER}
            labels={FACET_CLAIM_LABELS}
            meanings={FACET_CLAIM_MEANINGS}
            current={brand.current}
          />
        </ClaimCard>
      </ul>
    </Panel>
  );
};
