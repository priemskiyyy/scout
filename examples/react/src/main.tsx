import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Application } from "src/Application";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("The #root element is missing from index.html.");
}

// Scout sets no caching defaults, so the application chooses them here, once.
const client = new QueryClient();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <Application />
    </QueryClientProvider>
  </StrictMode>,
);
