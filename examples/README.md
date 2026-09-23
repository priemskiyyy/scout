# Example applications

Every example is the same product: Outpost, a small outdoor store searched through Scout. One index declaration runs on four engines inside the page, your API through `@priemskiyyy/scout-http`, and Orama, MiniSearch and Fuse.js in the browser or the app. Nothing leaves your device, and no engine account is needed.

Run `pnpm build` from the repository root first. The examples import the built public packages.

| Example          | Run                                | What it shows                                                                                                                                                             |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [React](react)   | `pnpm --filter example-react dev`  | The full tour: the store and its latest search, ten engines, what the numbers claim, a lab that breaks the engine, query identity and the TanStack cache, and a timeline. |
| [Vue](vue)       | `pnpm --filter example-vue dev`    | The store and its latest search with `@tanstack/vue-query`.                                                                                                               |
| [Solid](solid)   | `pnpm --filter example-solid dev`  | The store and its latest search with `@tanstack/solid-query`.                                                                                                             |
| [Svelte](svelte) | `pnpm --filter example-svelte dev` | The store and its latest search with `@tanstack/svelte-query` and runes.                                                                                                  |
| [Expo](expo)     | `pnpm --filter example-expo dev`   | The store as a React Native app, with a small lab, on `@tanstack/react-query`.                                                                                            |

Scout has no framework binding and needs none. Each example hands Scout's `infiniteQueryOptions` from `@priemskiyyy/scout-tanstack-query` to its framework's TanStack Query, and the search, its key and its cancellation are the same on every one.

## Shared code

`examples/shared` is the `example-shared` workspace package:

- `outpost/` holds the domain: the Zod schema and the catalogue, the one index declaration, your API with its lab switches and network log, the in-page engines, the runtime that wraps every adapter for the timeline, the dialect translations, the store's state and its search, the problem wording, and every number in words.
- `ui/` holds the Tailwind theme, the class recipes, the tones and the Phosphor icons the Vue, Solid and Svelte examples draw as CSS masks.

## Tests

`pnpm vitest run --project example-shared` tests the domain in Node, and `example-react`, `example-vue`, `example-solid` and `example-svelte` drive each page through its buttons in jsdom; `pnpm test:unit` includes them all. `pnpm test:examples` builds the four web examples and drives them in Chromium at phone and desktop widths. The Expo app is typechecked by `pnpm lint:typescript` and bundled for web, iOS and Android by `pnpm check:release`; nothing here runs it on a device.
