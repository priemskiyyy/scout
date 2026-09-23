<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import type { QueryClient } from "@tanstack/svelte-query";
  import type { Outpost } from "examples/shared/outpost/types/Outpost";
  import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
  import OutpostDemo from "src/components/OutpostDemo/OutpostDemo.svelte";

  type Props = {
    outpost: Outpost;
    runtime: OutpostRuntime;
    queryClient: QueryClient;
  };

  let { outpost, runtime, queryClient }: Props = $props();
</script>

<!-- The store's query needs the client from context, so it lives one level down. -->
<QueryClientProvider client={queryClient}>
  <OutpostDemo {outpost} {runtime} />
</QueryClientProvider>
