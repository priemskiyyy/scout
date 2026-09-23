import { ScoutError } from "@priemskiyyy/scout";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { formatError } from "examples/shared/outpost/formatting/formatError";
import { ERROR_MEANINGS } from "examples/shared/outpost/constants/labels";
import { ERROR_TONES } from "examples/shared/ui/constants/tones";

type SearchFailureProps = { error: Error };

export const SearchFailure: React.FunctionComponent<SearchFailureProps> = ({
  error,
}) => {
  if (!(error instanceof ScoutError)) {
    return <p className="text-sm">{formatError(error)}</p>;
  }

  return (
    <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      <dt className="text-stone-500">Code</dt>
      <dd className="flex flex-col items-start gap-1">
        <Badge tone={ERROR_TONES[error.code]}>{error.code}</Badge>
        <span className="text-stone-500">{ERROR_MEANINGS[error.code]}</span>
      </dd>
      <dt className="text-stone-500">Message</dt>
      <dd className="break-words">{error.message}</dd>
      {error.cause === undefined ? null : (
        <>
          <dt className="text-stone-500">Cause</dt>
          <dd className="break-words">{formatError(error.cause)}</dd>
        </>
      )}
    </dl>
  );
};
