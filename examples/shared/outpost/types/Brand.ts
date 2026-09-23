import type { z } from "zod";

import type { BrandSchema } from "examples/shared/outpost/constants/productSchema";

export type Brand = z.infer<typeof BrandSchema>;
