import { useEffect, useRef, useState } from "react";
import type { Product } from "src/catalogue";
import { Icon } from "src/Icon";
import { ProductArtwork } from "src/ProductArtwork";

type ProductDetailsProps = {
  product: Product;
  native: unknown;
  onClose: () => void;
};

export const ProductDetails = ({
  product,
  native,
  onClose,
}: ProductDetailsProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"document" | "native">("document");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="product-dialog"
      onClose={onClose}
      aria-labelledby="product-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="dialog-content">
        <button
          className="icon-button close-dialog"
          type="button"
          aria-label="Close document"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <ProductArtwork category={product.category} />
        <p className="product-brand">{product.brand}</p>
        <h2 id="product-title">{product.name}</h2>
        <p>{product.description}</p>
        <div className="document-tabs" aria-label="Document view">
          <button
            type="button"
            aria-pressed={view === "document"}
            onClick={() => setView("document")}
          >
            Typed document
          </button>
          <button
            type="button"
            aria-pressed={view === "native"}
            onClick={() => setView("native")}
          >
            Native hit
          </button>
        </div>
        <pre>
          <code>
            {JSON.stringify(view === "document" ? product : native, null, 2)}
          </code>
        </pre>
      </div>
    </dialog>
  );
};
