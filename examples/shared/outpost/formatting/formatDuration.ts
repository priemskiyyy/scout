export const formatDuration = (milliseconds: number) => {
  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)} ms`;
  }

  return `${(milliseconds / 1_000).toFixed(1)} s`;
};
