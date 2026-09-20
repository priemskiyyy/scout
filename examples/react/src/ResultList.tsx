import { useMemo, useState } from "react";
import type { SearchBuilder } from "@priemskiyyy/scout";
import {
  flattenHits,
  infiniteQueryOptions,
} from "@priemskiyyy/scout-tanstack-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Product } from "src/catalogue";
import { formatTotal } from "src/formatTotal";
import { Icon } from "src/Icon";
import { ProductArtwork } from "src/ProductArtwork";
import { ProductDetails } from "src/ProductDetails";
import type { ProductShape } from "src/search";

type ResultListProps = {
  search: SearchBuilder<ProductShape>;
  enabled: boolean;
  current: boolean;
  onReset: () => void;
};

export const ResultList = ({
  search,
  enabled,
  current,
  onReset,
}: ResultListProps) => {
  const query = useInfiniteQuery({
    ...infiniteQueryOptions(search),
    staleTime: 30_000,
    enabled,
    retry: false,
  });
  const [inspected, setInspected] = useState<{
    document: Product;
    native: unknown;
  } | null>(null);
  const hits = useMemo(() => flattenHits(query.data), [query.data]);
  const first = query.data?.pages[0];

  const handleLoadMore = () => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }
    return query.fetchNextPage();
  };

  if (!enabled) {
    return (
      <section className="empty-state">
        <Icon name="search" size={32} />
        <h2>What are you looking for?</h2>
        <p>Type a product, or try one of the searches above.</p>
      </section>
    );
  }
  if (query.error !== null) {
    return (
      <section className="empty-state">
        <h2>This search could not finish</h2>
        <p>{query.error.message}</p>
        <button type="button" onClick={() => query.refetch()}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section
      className="results"
      aria-label="Search results"
      aria-busy={query.isFetching || !current}
    >
      <div className="results-heading" aria-live="polite">
        <h2>{first === undefined ? "Searching…" : formatTotal(first.total)}</h2>
        <span className="search-status">
          {(() => {
            if (!current) {
              return "Waiting for you to finish typing…";
            }
            if (first === undefined) {
              return "Searching the catalogue";
            }
            return `Exact count · ${Math.round(first.took.milliseconds)} ms`;
          })()}
        </span>
      </div>
      <ul className="hits">
        {hits.map((hit) => (
          <li key={hit.id}>
            <button
              className="result-open"
              type="button"
              onClick={() => setInspected(hit)}
              aria-label={`Inspect ${hit.document.name}`}
            >
              <ProductArtwork category={hit.document.category} />
              <div className="result-copy">
                <span className="product-brand">{hit.document.brand}</span>
                <h3>{hit.document.name}</h3>
                <p>{hit.document.description}</p>
                <span
                  className={hit.document.inStock ? "stock available" : "stock"}
                >
                  {hit.document.inStock ? "In stock" : "Out of stock"}
                </span>
              </div>
              <div className="result-end">
                <strong>${hit.document.price}</strong>
                <span className="inspect-label">
                  Inspect <Icon name="arrow" size={15} />
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {hits.length === 0 && !query.isFetching ? (
        <div className="empty-state">
          <Icon name="search" size={32} />
          <h2>No products found</h2>
          <p>Try another search or clear your filters to see more.</p>
          <button type="button" onClick={onReset}>
            Clear filters
          </button>
        </div>
      ) : null}
      {query.hasNextPage ? (
        <div className="load-more">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more products"}
          </button>
          <span>Showing {hits.length} so far</span>
        </div>
      ) : null}
      {inspected === null ? null : (
        <ProductDetails
          product={inspected.document}
          native={inspected.native}
          onClose={() => setInspected(null)}
        />
      )}
    </section>
  );
};
