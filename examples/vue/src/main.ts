import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import Application from "src/Application.vue";
import "src/style.css";

const { outpost, runtime } = startOutpost({ latency: 400 });

createApp(Application, { outpost, runtime })
  .use(VueQueryPlugin, {
    queryClient: new QueryClient({ defaultOptions: QUERY_DEFAULTS }),
  })
  .mount("#root");
