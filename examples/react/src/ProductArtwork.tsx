import { Icon } from "src/Icon";

type ProductArtworkProps = { category: string };

export const ProductArtwork = ({ category }: ProductArtworkProps) => {
  const name =
    category === "audio" ||
    category === "input" ||
    category === "kitchen" ||
    category === "lighting" ||
    category === "optics"
      ? category
      : "box";
  return (
    <div className={`product-art ${name}`}>
      <Icon name={name} size={36} />
    </div>
  );
};
