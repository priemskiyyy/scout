/** The message of anything thrown, which need not be an Error. */
export const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};
