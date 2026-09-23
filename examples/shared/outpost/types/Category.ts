import type { z } from "zod";

import type { CategorySchema } from "examples/shared/outpost/constants/productSchema";

export type Category = z.infer<typeof CategorySchema>;
