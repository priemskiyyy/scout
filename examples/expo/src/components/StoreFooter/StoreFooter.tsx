import type React from "react";
import { StyleSheet, View } from "react-native";

import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { Lab } from "src/components/Lab/Lab";
import { LatestSearch } from "src/components/LatestSearch/LatestSearch";
import { LoadMore } from "src/components/LoadMore/LoadMore";
import { SessionFooter } from "src/components/SessionFooter/SessionFooter";
import type { StoreQuery } from "src/types/StoreQuery";

type StoreFooterProps = {
  state: StoreState;
  searched: StoreState;
  query: StoreQuery;
  status: SearchStatus;
  latest: StoreResult | null;
  shown: number;
  backend: CatalogueBackend;
  disposed: boolean;
  onDisposeToggle: () => void;
  onEmptySetToggle: () => void;
};

/** Everything below the results: more of them, what ran, and the lab. */
export const StoreFooter: React.FunctionComponent<StoreFooterProps> = ({
  state,
  searched,
  query,
  status,
  latest,
  shown,
  backend,
  disposed,
  onDisposeToggle,
  onEmptySetToggle,
}) => {
  const handleLoadMorePress = () => {
    query.fetchNextPage().catch(() => {});
  };

  return (
    <View style={styles.footer}>
      {latest === null || shown === 0 ? null : (
        <LoadMore
          shown={shown}
          latest={latest}
          loading={query.isFetchingNextPage}
          onPress={handleLoadMorePress}
        />
      )}
      <LatestSearch state={searched} query={query} status={status} />
      <Lab
        backend={backend}
        disposed={disposed}
        emptySet={state.emptySet}
        onEmptySetToggle={onEmptySetToggle}
        onDisposeToggle={onDisposeToggle}
      />
      <SessionFooter engine={state.engine} />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: { gap: 16, paddingTop: 4 },
});
