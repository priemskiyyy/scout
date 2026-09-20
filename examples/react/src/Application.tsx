import { useMemo, useRef, useState } from "react";
import { PRODUCTS } from "src/catalogue";
import { FacetPanel } from "src/FacetPanel";
import { Icon } from "src/Icon";
import { QueryInspector } from "src/QueryInspector";
import { ResultList } from "src/ResultList";
import { ENGINES, productIndex } from "src/search";
import type { Engine } from "src/search";
import type { FacetField } from "src/types/FacetField";
import type { FilterSelection } from "src/types/FilterSelection";
import { useDebounced } from "src/useDebounced";

const PAGE_SIZE = 4;
const MAX_PRICE = 700;
const NOTHING_SELECTED: FilterSelection = { brand: [], category: [] };
const ENGINE_LABELS: Readonly<Record<Engine, string>> = {
  orama: "Orama",
  minisearch: "MiniSearch",
  fuse: "Fuse.js",
};
const SUGGESTIONS = [
  { label: "Headphones", query: "headphones" },
  { label: "Desk setup", query: "desk" },
  { label: "Coffee corner", query: "kitchen" },
  { label: "Try a typo", query: "headphnes" },
];

const toggle = (values: readonly string[], value: string): readonly string[] =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

export const Application = () => {
  const [engine, setEngine] = useState<Engine>("orama");
  const [text, setText] = useState("headphones");
  const [selected, setSelected] = useState<FilterSelection>(NOTHING_SELECTED);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [inspecting, setInspecting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(text, 200);
  const products = useMemo(() => productIndex(engine), [engine]);

  const base = useMemo(
    () =>
      products.search(debounced).where((product, { and }) => {
        const clauses = [product.price.lte(maxPrice)];
        if (inStockOnly) {
          clauses.push(product.inStock.eq(true));
        }
        return and(...clauses);
      }),
    [products, debounced, maxPrice, inStockOnly],
  );

  const results = useMemo(() => {
    let search = base;
    if (selected.brand.length > 0) {
      search = search.where((product) => product.brand.in(selected.brand));
    }
    if (selected.category.length > 0) {
      search = search.where((product) =>
        product.category.in(selected.category),
      );
    }
    return search.pageSize(PAGE_SIZE);
  }, [base, selected]);
  const facets = useMemo(
    () => base.facets("brand", "category").pageSize(1),
    [base],
  );
  const enabled = debounced.trim().length > 0;
  const activeCount =
    selected.brand.length +
    selected.category.length +
    Number(inStockOnly) +
    Number(maxPrice < MAX_PRICE);

  const handleToggle = (field: FacetField, value: string) =>
    setSelected((previous) => ({
      ...previous,
      [field]: toggle(previous[field], value),
    }));
  const handleReset = () => {
    setSelected(NOTHING_SELECTED);
    setInStockOnly(false);
    setMaxPrice(MAX_PRICE);
  };
  const handleSuggestion = (query: string) => {
    setText(query);
    handleReset();
  };
  const handleClear = () => {
    setText("");
    input.current?.focus();
  };

  return (
    <div className="application">
      <header className="site-header">
        <a className="wordmark" href="./">
          <Icon name="compass" size={27} />
          Scout<span>Search playground</span>
        </a>
        <a
          className="source-link"
          href="https://github.com/priemskiyyy/scout/tree/main/examples/react"
          target="_blank"
          rel="noreferrer"
        >
          View source <Icon name="code" size={17} />
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <h1>A good search starts here.</h1>
            <p>A small catalogue. Three real engines. One typed search.</p>
          </div>
          <span className="local-badge">
            <span />
            Runs in your browser
          </span>
        </section>
        <section className="search-workspace" aria-label="Search playground">
          <div className="search-toolbar">
            <div className="search-input">
              <Icon name="search" size={24} />
              <input
                ref={input}
                type="search"
                aria-label="Search products"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Find headphones, keyboards, something for your desk…"
                autoComplete="off"
              />
              {text.length > 0 ? (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={handleClear}
                >
                  <Icon name="close" size={18} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="inspect-query"
              aria-label="Inspect query"
              aria-expanded={inspecting}
              onClick={() => setInspecting((value) => !value)}
            >
              <Icon name="code" size={18} />
              <span>Inspect query</span>
            </button>
          </div>
          <div className="suggestions">
            <span>Try a search</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion.label}
                onClick={() => handleSuggestion(suggestion.query)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          {inspecting ? (
            <QueryInspector
              key={JSON.stringify([debounced, selected, maxPrice, inStockOnly])}
              query={debounced}
              selection={selected}
              maxPrice={maxPrice}
              inStockOnly={inStockOnly}
              pageSize={PAGE_SIZE}
            />
          ) : null}
          <div className="engine-toolbar">
            <div className="engine-switch" aria-label="Search engine">
              {ENGINES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={name === engine}
                  onClick={() => setEngine(name)}
                >
                  {ENGINE_LABELS[name]}
                </button>
              ))}
            </div>
            <span className="engine-note">Same search. Different engine.</span>
            <span className="catalogue-count">{PRODUCTS.length} products</span>
            <button
              type="button"
              className="mobile-filter-toggle"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((value) => !value)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </div>
          <div
            className={
              showFilters ? "workspace-body filters-visible" : "workspace-body"
            }
          >
            <aside className="filters" aria-label="Filters">
              <div className="filter-heading">
                <h2>Filters</h2>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleReset}
                  disabled={activeCount === 0}
                >
                  Reset{activeCount > 0 ? ` (${activeCount})` : ""}
                </button>
              </div>
              <label className="stock-toggle">
                <span>In stock only</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  role="switch"
                />
              </label>
              <div className="price-filter">
                <label htmlFor="price-limit">
                  Maximum price<strong>${maxPrice}</strong>
                </label>
                <input
                  id="price-limit"
                  type="range"
                  min={15}
                  max={MAX_PRICE}
                  step={5}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                />
                <div>
                  <span>$15</span>
                  <span>$700</span>
                </div>
              </div>
              <FacetPanel
                search={facets}
                selected={selected}
                onToggle={handleToggle}
                enabled={enabled}
                withCounts={engine === "orama"}
              />
            </aside>
            <div className="results-area">
              {activeCount > 0 ? (
                <div className="active-filters" aria-label="Active filters">
                  {(["brand", "category"] as const).flatMap((field) =>
                    selected[field].map((value) => (
                      <button
                        type="button"
                        key={`${field}:${value}`}
                        onClick={() => handleToggle(field, value)}
                        aria-label={`Remove ${value} filter`}
                      >
                        {value}
                        <Icon name="close" size={12} />
                      </button>
                    )),
                  )}
                  {inStockOnly ? (
                    <button type="button" onClick={() => setInStockOnly(false)}>
                      In stock
                      <Icon name="close" size={12} />
                    </button>
                  ) : null}
                  {maxPrice < MAX_PRICE ? (
                    <button
                      type="button"
                      onClick={() => setMaxPrice(MAX_PRICE)}
                    >
                      Under ${maxPrice}
                      <Icon name="close" size={12} />
                    </button>
                  ) : null}
                </div>
              ) : null}
              <ResultList
                key={engine}
                search={results}
                enabled={enabled}
                current={text === debounced}
                onReset={handleReset}
              />
            </div>
          </div>
        </section>
        <footer className="page-footer">
          <span>Built with Scout + TanStack Query</span>
          <span>Click a product to inspect its document.</span>
        </footer>
      </main>
    </div>
  );
};
