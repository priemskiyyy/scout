/** What the page says about an engine, read from its adapter's source. */
export type EngineGuide = {
  name: string;
  packageName: string;
  runs: string;
  refuses: string;
  cancels: string;
};
