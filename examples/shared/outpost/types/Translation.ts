/** What one adapter did with a search: handed its client a request, or refused. */
export type Translation =
  | { kind: "sent"; request: unknown }
  | { kind: "refused"; message: string }
  | { kind: "answered-by-scout" }
  | { kind: "failed"; message: string };
