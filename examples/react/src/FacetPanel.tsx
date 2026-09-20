import type { SearchBuilder } from "@priemskiyyy/scout";
import { queryOptions } from "@priemskiyyy/scout-tanstack-query";
import { useQuery } from "@tanstack/react-query";
import { PRODUCTS } from "src/catalogue";
import type { ProductShape } from "src/search";
import type { FacetField } from "src/types/FacetField";
import type { FilterSelection } from "src/types/FilterSelection";

const FIELDS: readonly FacetField[] = ["brand", "category"];
// Choices belong to this application's catalogue. Counts only come from an engine.
const CHOICES = {
  brand: [...new Set(PRODUCTS.map((product) => product.brand))].sort(),
  category: [...new Set(PRODUCTS.map((product) => product.category))].sort(),
};

type FacetPanelProps = {
  search: SearchBuilder<ProductShape, FacetField>;
  selected: FilterSelection;
  onToggle: (field: FacetField, value: string) => void;
  enabled: boolean;
  withCounts: boolean;
};

export const FacetPanel = ({
  search,
  selected,
  onToggle,
  enabled,
  withCounts,
}: FacetPanelProps) => {
  const query = useQuery({
    ...queryOptions(search),
    staleTime: 30_000,
    enabled: enabled && withCounts,
    retry: false,
  });

  return (
    <div className="facet-groups">
      {FIELDS.map((field) => {
        const facet = withCounts ? query.data?.facets[field] : undefined;
        return (
          <fieldset key={field} className="facet">
            <legend>{field === "brand" ? "Brand" : "Category"}</legend>
            {CHOICES[field].map((value) => {
              const count = facet?.values.find(
                (bucket) => bucket.value === value,
              )?.count;
              return (
                <label key={value} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selected[field].includes(value)}
                    onChange={() => onToggle(field, value)}
                  />
                  <span className="facet-value">{value}</span>
                  {facet === undefined ? null : (
                    <span className="count">{count ?? 0}</span>
                  )}
                </label>
              );
            })}
          </fieldset>
        );
      })}
      <p className="filter-note">
        {withCounts
          ? "Counts reflect the search before brand and category filters."
          : "Filters work here too. Facet counts are available with Orama."}
      </p>
      {query.error !== null && withCounts ? (
        <p className="refusal">Facet counts could not load.</p>
      ) : null}
    </div>
  );
};
