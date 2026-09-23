import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import { Application } from "src/Application";
import "src/style.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("The page has no #root element.");
}

const queryClient = new QueryClient({ defaultOptions: QUERY_DEFAULTS });
const { outpost, runtime } = startOutpost({ latency: 400 });

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Application outpost={outpost} runtime={runtime} />
    </QueryClientProvider>
  ),
  root,
);
