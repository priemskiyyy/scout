import { useSyncExternalStore } from "react";

import type { ValueStore } from "examples/shared/outpost/types/ValueStore";

export const useValueStore = <T>(store: ValueStore<T>) =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
