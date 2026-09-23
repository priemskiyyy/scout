import { shallowRef } from "vue";

import {
  initialStoreState,
  storeReducer,
} from "examples/shared/outpost/state/storeReducer";
import type { StoreAction } from "examples/shared/outpost/types/StoreAction";

/** The store's controls as one state, which only the shared reducer changes. */
export const useStoreState = () => {
  const state = shallowRef(initialStoreState);

  const dispatch = (action: StoreAction) => {
    state.value = storeReducer(state.value, action);
  };

  return { state, dispatch };
};
