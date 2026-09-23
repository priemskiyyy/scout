import type { z } from "zod";

import type { ProductSchema } from "examples/shared/outpost/constants/productSchema";

export type Product = z.infer<typeof ProductSchema>;
