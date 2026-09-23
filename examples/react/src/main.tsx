import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import { Application } from "src/Application";
import "src/styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

const queryClient = new QueryClient({ defaultOptions: QUERY_DEFAULTS });

const { outpost, runtime } = startOutpost({ latency: 400 });

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Application outpost={outpost} runtime={runtime} />
    </QueryClientProvider>
  </StrictMode>,
);
