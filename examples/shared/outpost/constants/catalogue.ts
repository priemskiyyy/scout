import {
  BrandSchema,
  CategorySchema,
} from "examples/shared/outpost/constants/productSchema";

export const BRANDS = BrandSchema.options;

export const CATEGORIES = CategorySchema.options;

/** The cheapest and dearest price in the catalogue, which bound the price filter. */
export const PRICE_BOUNDS = { min: 0, max: 700 };

/** The minimum ratings the store offers as a filter. */
export const RATING_STEPS: readonly number[] = [4, 4.5];

/**
 * Nothing in Scout watches an in-page database, so the page owns a revision
 * for each one and bumps it on change. This catalogue never changes.
 */
export const CATALOGUE_REVISION = 1;
