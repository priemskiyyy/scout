/** Two searches written differently, and whether Scout says they are one. */
export type KeyComparison = {
  title: string;
  explanation: string;
  left: { code: string; key: readonly unknown[] };
  right: { code: string; key: readonly unknown[] };
};
