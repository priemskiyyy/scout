# Outpost on Expo

Outpost as a React Native app. The store runs on the same shared domain as the web examples: one index declaration, your API as a backend inside the app behind `@priemskiyyy/scout-http`, and Orama, MiniSearch and Fuse.js running in the app too. Nothing is sent over the network.

```sh
pnpm build
pnpm --filter example-expo dev
```

How it fits together:

- `index.tsx` starts Outpost with `startOutpost` from `examples/shared`, creates the `QueryClient` with the shared `QUERY_DEFAULTS`, so a refusal is final and a provider failure gets one retry, and wraps the app in `QueryClientProvider`.
- `src/Application.tsx` keeps the store's controls in the shared `storeReducer`, debounces the query, builds the search with `buildStoreSearch` and runs it with TanStack Query's `useInfiniteQuery` over `createStoreQueryOptions`. The screen is one `FlatList`: the controls are its header, the hits its rows, and the latest search and the lab its footer, so only the rows on screen are rendered.
- `src/components/HighlightedText/HighlightedText.tsx` draws Scout's highlight parts as nested `Text`. A part is text and never markup, so there is nothing to parse and nothing a document can inject.
- Stop aborts the search in flight. Scout settles it as `aborted` at once, and your API stops working on it, because the app's client passes the signal on.
- The lab card changes your API: its latency, an outage, a corrupt document. It also asks for an empty set, which Scout answers without asking any engine, and disposes Scout, which the store can restart. Changing your API invalidates what TanStack Query cached, so the store searches again.
- `assets/icon.png` is the app icon and `assets/favicon.png` the web export's favicon.

What React Native changes:

- React Native installs its own `AbortController`, from `abort-controller` 3, whose signals carry no `reason` and which has no `AbortSignal.any`. Scout's core reads only `aborted` and the abort event, so a stopped search still settles as `aborted`, but on a device its error has no cause. `createStoreQueryOptions` joins its two signals with the shared `getEitherSignal` rather than `AbortSignal.any`, for the same reason.

`pnpm check` typechecks the app, and `pnpm --filter example-expo build` and `build:native` bundle it for web, iOS and Android. The native bundles compile to Hermes bytecode, which checks the syntax and the regular expressions of everything the app and the shared domain ship, but not which APIs exist at run time. Those were exercised only in the web export, in a browser. Nothing in this repository runs it on a device.
