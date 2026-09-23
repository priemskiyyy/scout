import type { StoreAction } from "examples/shared/outpost/types/StoreAction";

/** A filter the store is applying, and the action that removes it. */
export type ActiveFilter = { key: string; label: string; remove: StoreAction };
