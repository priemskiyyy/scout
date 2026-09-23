import { QueryClient } from "@tanstack/svelte-query";
import { mount } from "svelte";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import Application from "src/Application.svelte";
import "src/style.css";

const target = document.getElementById("root");

if (target === null) {
  throw new Error("The page has no #root element.");
}

const queryClient = new QueryClient({ defaultOptions: QUERY_DEFAULTS });
const { outpost, runtime } = startOutpost({ latency: 400 });

mount(Application, { target, props: { outpost, runtime, queryClient } });
