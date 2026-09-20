import type { StandardSchema } from "src/types/StandardSchema";

/**
 * Validates one unknown document with a synchronous Standard Schema.
 * Async validators are refused so mapping a page never introduces per-hit waits.
 */
export const validateDocument = <TDocument>(
  schema: StandardSchema<TDocument>,
  document: unknown,
) => {
  const answer = schema["~standard"].validate(document);
  if (answer instanceof Promise) {
    // The schema is refused synchronously, but its later rejection still needs
    // an observer so validation cannot cause an unhandled process error.
    answer.catch(() => undefined);
    return {
      issues: [
        {
          message:
            "The schema answered asynchronously. Scout validates documents synchronously.",
        },
      ],
    };
  }
  return answer;
};
