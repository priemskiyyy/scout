import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";

import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";

type ClaimCardProps = {
  title: string;
  value: string;
  children: ReactNode;
};

export const ClaimCard: React.FunctionComponent<ClaimCardProps> = ({
  title,
  value,
  children,
}) => (
  <li className={clsx("flex min-w-0 flex-col gap-3 p-4", CARD_CLASS_NAME)}>
    <div className="flex flex-col gap-0.5">
      <h4 className="text-sm font-medium text-stone-500">{title}</h4>
      <p aria-live="polite" className="text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
    {children}
  </li>
);
