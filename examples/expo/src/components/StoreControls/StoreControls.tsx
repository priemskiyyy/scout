import type React from "react";
import type { Dispatch } from "react";
import { StyleSheet, View } from "react-native";

import { ENGINE_OPTIONS } from "examples/shared/outpost/constants/engineOptions";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { Card } from "src/components/Card/Card";
import { FilterChips } from "src/components/FilterChips/FilterChips";
import { Header } from "src/components/Header/Header";
import { SearchField } from "src/components/SearchField/SearchField";
import { SearchPresets } from "src/components/SearchPresets/SearchPresets";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { StoreToolbar } from "src/components/StoreToolbar/StoreToolbar";

type StoreControlsProps = {
  state: StoreState;
  status: SearchStatus;
  latest: StoreResult | null;
  searching: boolean;
  dispatch: Dispatch<StoreAction>;
  onStopPress: () => void;
};

/** Everything above the results: the header, the engine and the search. */
export const StoreControls: React.FunctionComponent<StoreControlsProps> = ({
  state,
  status,
  latest,
  searching,
  dispatch,
  onStopPress,
}) => (
  <View style={styles.controls}>
    <Header status={status} />
    <Card
      title="Outpost store"
      description="One typed search, on the engine you pick. Your API, Orama, MiniSearch and Fuse.js all run inside the app."
    >
      <SegmentedControl
        label="Engine"
        options={ENGINE_OPTIONS}
        value={state.engine}
        onSelect={(engine) => dispatch({ type: "ENGINE_SELECTED", engine })}
      />
      <SearchField
        value={state.query}
        searching={searching}
        onChange={(value) => dispatch({ type: "QUERY_CHANGED", query: value })}
        onStopPress={onStopPress}
      />
      <SearchPresets
        query={state.query}
        onSelect={(preset) =>
          dispatch({ type: "PRESET_SELECTED", query: preset })
        }
      />
      <StoreToolbar
        state={state}
        status={status}
        latest={latest}
        onProfileSelect={(profile) =>
          dispatch({ type: "PROFILE_SELECTED", profile })
        }
        onSortSelect={(sort) => dispatch({ type: "SORT_SELECTED", sort })}
        onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
        onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
      />
      <FilterChips
        state={state}
        latest={latest}
        onCategoryToggle={(category) =>
          dispatch({ type: "CATEGORY_TOGGLED", category })
        }
        onBrandToggle={(brand) => dispatch({ type: "BRAND_TOGGLED", brand })}
        onPriceBandSelect={(priceBand) =>
          dispatch({ type: "PRICE_BAND_SELECTED", priceBand })
        }
        onInStockToggle={() => dispatch({ type: "IN_STOCK_TOGGLED" })}
        onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
      />
    </Card>
  </View>
);

const styles = StyleSheet.create({
  controls: { gap: 16 },
});
