import { useState } from "react";
import type { FilterSelection } from "src/types/FilterSelection";

type QueryInspectorProps = {
  query: string;
  selection: FilterSelection;
  maxPrice: number;
  inStockOnly: boolean;
  pageSize: number;
};

export const QueryInspector = ({
  query,
  selection,
  maxPrice,
  inStockOnly,
  pageSize,
}: QueryInspectorProps) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const clauses = [`product.price.lte(${maxPrice})`];
  if (inStockOnly) {
    clauses.push("product.inStock.eq(true)");
  }
  for (const field of ["brand", "category"] as const) {
    if (selection[field].length > 0) {
      clauses.push(`product.${field}.in(${JSON.stringify(selection[field])})`);
    }
  }
  const code = `const search = scout.index("products")\n  .search(${JSON.stringify(query)})\n  .where((product, { and }) => and(\n    ${clauses.join(",\n    ")}\n  ))\n  .pageSize(${pageSize});\n\nuseInfiniteQuery(infiniteQueryOptions(search));`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <section className="query-inspector" aria-label="Query inspector">
      <div className="inspector-heading">
        <div>
          <strong>Your search, in TypeScript</strong>
          <p>The same consumer code runs on every engine.</p>
        </div>
        <button type="button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      {copyFailed ? (
        <p role="status">Clipboard unavailable. Select the code to copy it.</p>
      ) : null}
    </section>
  );
};
