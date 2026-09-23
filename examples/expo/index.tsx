import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerRootComponent } from "expo";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import { Application } from "src/Application";

const queryClient = new QueryClient({ defaultOptions: QUERY_DEFAULTS });

const { outpost, runtime } = startOutpost({ latency: 400 });

const Root = () => (
  <QueryClientProvider client={queryClient}>
    <Application outpost={outpost} runtime={runtime} />
  </QueryClientProvider>
);

registerRootComponent(Root);
