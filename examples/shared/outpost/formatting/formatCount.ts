/** A count and its noun, singular for one. */
export const formatCount = (count: number, noun: string) => {
  if (count === 1) {
    return `1 ${noun}`;
  }

  return `${count} ${noun}s`;
};
