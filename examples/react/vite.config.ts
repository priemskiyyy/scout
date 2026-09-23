import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      src: fileURLToPath(new URL("./src", import.meta.url)),
      "examples/shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // TanStack Query marks its hooks "use client" for React Server
      // Components. This is a single page application with no server
      // components, so dropping the directive is correct and the warning is
      // noise on every build.
      onwarn: (warning, warn) => {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
          return;
        }

        warn(warning);
      },
    },
  },
});
