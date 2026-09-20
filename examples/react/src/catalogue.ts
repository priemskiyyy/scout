import type { StandardSchema } from "@priemskiyyy/scout";

/**
 * The application document. All engines index exactly this shape, so nothing
 * downstream has to know which one answered.
 */
export type Product = {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  inStock: boolean;
};

const isProduct = (value: unknown): value is Product => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record: Record<string, unknown> = { ...value };
  return (
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["description"] === "string" &&
    typeof record["brand"] === "string" &&
    typeof record["category"] === "string" &&
    typeof record["price"] === "number" &&
    typeof record["inStock"] === "boolean"
  );
};

/**
 * A hand written Standard Schema, so this example installs no validator. A
 * real application passes its Zod, Valibot or ArkType schema here instead, and
 * Scout reads the document type straight off it.
 */
export const ProductSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "scout-example",
    validate: (value) =>
      isProduct(value)
        ? { value }
        : { issues: [{ message: "Not a product." }] },
  },
};

/** The corpus all engines are built from. It never changes while the page is open. */
export const PRODUCTS: readonly Product[] = [
  {
    id: "p01",
    name: "Wireless Headphones",
    description: "Noise cancelling over ear headphones with 30 hour battery",
    brand: "Acme Audio",
    category: "audio",
    price: 199,
    inStock: true,
  },
  {
    id: "p02",
    name: "Wired Headphones",
    description: "Studio monitor headphones with a coiled cable",
    brand: "Acme Audio",
    category: "audio",
    price: 99,
    inStock: false,
  },
  {
    id: "p03",
    name: "Studio Headphones Pro",
    description: "Reference headphones for mixing and mastering",
    brand: "Acme Audio",
    category: "audio",
    price: 349,
    inStock: true,
  },
  {
    id: "p04",
    name: "Earbuds Mini",
    description: "Pocket sized wireless earbuds with a charging case",
    brand: "Acme Audio",
    category: "audio",
    price: 79,
    inStock: true,
  },
  {
    id: "p05",
    name: "Desk Speaker Pair",
    description: "Near field speakers with a warm low end",
    brand: "Acme Audio",
    category: "audio",
    price: 259,
    inStock: false,
  },
  {
    id: "p06",
    name: "Portable Speaker",
    description: "Splash proof speaker for a loud kitchen",
    brand: "Acme Audio",
    category: "audio",
    price: 89,
    inStock: true,
  },
  {
    id: "p07",
    name: "Mechanical Keyboard",
    description: "Tactile switches on a steel plate with hot swap sockets",
    brand: "Beta Input",
    category: "input",
    price: 149,
    inStock: true,
  },
  {
    id: "p08",
    name: "Low Profile Keyboard",
    description: "Short travel switches for a quiet desk",
    brand: "Beta Input",
    category: "input",
    price: 129,
    inStock: true,
  },
  {
    id: "p09",
    name: "Wireless Mouse",
    description: "Ergonomic shape for long sessions",
    brand: "Beta Input",
    category: "input",
    price: 49,
    inStock: true,
  },
  {
    id: "p10",
    name: "Trackball",
    description: "Thumb operated trackball for a small desk",
    brand: "Beta Input",
    category: "input",
    price: 69,
    inStock: false,
  },
  {
    id: "p11",
    name: "Drawing Tablet",
    description: "Pressure sensitive tablet with a battery free pen",
    brand: "Beta Input",
    category: "input",
    price: 229,
    inStock: true,
  },
  {
    id: "p12",
    name: "Foot Pedal",
    description: "Three switch pedal for transcription and shortcuts",
    brand: "Beta Input",
    category: "input",
    price: 59,
    inStock: true,
  },
  {
    id: "p13",
    name: "Pour Over Kettle",
    description: "Gooseneck kettle with a temperature dial",
    brand: "Delta Home",
    category: "kitchen",
    price: 95,
    inStock: true,
  },
  {
    id: "p14",
    name: "Burr Grinder",
    description: "Stepless conical burr grinder for espresso",
    brand: "Delta Home",
    category: "kitchen",
    price: 219,
    inStock: true,
  },
  {
    id: "p15",
    name: "Ceramic Mug",
    description: "Thick walled mug that keeps a drink warm",
    brand: "Delta Home",
    category: "kitchen",
    price: 15,
    inStock: false,
  },
  {
    id: "p16",
    name: "Cast Iron Pan",
    description: "Pre seasoned pan for a very hot kitchen",
    brand: "Delta Home",
    category: "kitchen",
    price: 65,
    inStock: true,
  },
  {
    id: "p17",
    name: "Kitchen Scale",
    description: "Half gram resolution scale with a tare button",
    brand: "Delta Home",
    category: "kitchen",
    price: 39,
    inStock: true,
  },
  {
    id: "p18",
    name: "Desk Lamp",
    description: "Warm light for a dark corner with a dimmer",
    brand: "Delta Home",
    category: "lighting",
    price: 35,
    inStock: true,
  },
  {
    id: "p19",
    name: "Floor Lamp",
    description: "Uplighter with a linen shade",
    brand: "Delta Home",
    category: "lighting",
    price: 119,
    inStock: false,
  },
  {
    id: "p20",
    name: "Clip Light",
    description: "Small clip on light for a shelf or a headboard",
    brand: "Delta Home",
    category: "lighting",
    price: 25,
    inStock: true,
  },
  {
    id: "p21",
    name: "Binoculars",
    description: "Wide field binoculars for birds and for a dark sky",
    brand: "Corvid Optics",
    category: "optics",
    price: 289,
    inStock: true,
  },
  {
    id: "p22",
    name: "Spotting Scope",
    description: "Angled scope with a fine focus wheel",
    brand: "Corvid Optics",
    category: "optics",
    price: 649,
    inStock: false,
  },
  {
    id: "p23",
    name: "Hand Lens",
    description: "Triple lens loupe for field work",
    brand: "Corvid Optics",
    category: "optics",
    price: 45,
    inStock: true,
  },
  {
    id: "p24",
    name: "Telescope Eyepiece",
    description: "Wide angle eyepiece with a rubber eyecup",
    brand: "Corvid Optics",
    category: "optics",
    price: 175,
    inStock: true,
  },
  {
    id: "p25",
    name: "Travel Headphones",
    description: "Foldable headphones for a quieter commute",
    brand: "North Sound",
    category: "audio",
    price: 129,
    inStock: true,
  },
  {
    id: "p26",
    name: "Open Back Headphones",
    description: "Airy, detailed headphones for listening at home",
    brand: "North Sound",
    category: "audio",
    price: 279,
    inStock: true,
  },
  {
    id: "p27",
    name: "Kids Headphones",
    description: "Soft cushions and a volume limit for little listeners",
    brand: "Acme Audio",
    category: "audio",
    price: 39,
    inStock: false,
  },
  {
    id: "p28",
    name: "Wireless Headphones Plus",
    description: "Comfortable headphones with adaptive noise cancellation",
    brand: "North Sound",
    category: "audio",
    price: 249,
    inStock: true,
  },
];
