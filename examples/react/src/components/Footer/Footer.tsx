import type React from "react";

import { CODE_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import { BUILT_ON } from "examples/shared/outpost/constants/packages";

export const Footer: React.FunctionComponent = () => (
  <footer className="border-t border-stone-200/70 dark:border-stone-800">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          Every engine runs inside this page, or is handed a client that records
          what it was sent, so nothing leaves your browser.
        </span>
        <a
          href="https://github.com/priemskiyyy/scout"
          className="underline-offset-2 hover:underline sm:ml-auto"
        >
          Scout on GitHub
        </a>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-stone-600 dark:text-stone-400">
          Built on
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {BUILT_ON.map((name) => (
            <li key={name} className={CODE_CLASS_NAME}>
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);
