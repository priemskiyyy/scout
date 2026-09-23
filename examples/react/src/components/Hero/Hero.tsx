import { Flask, MagnifyingGlass } from "@phosphor-icons/react";
import type React from "react";

import { HeroStep } from "src/components/Hero/HeroStep";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { scrollToElement } from "src/utils/scrollToElement";

export const Hero: React.FunctionComponent = () => (
  <section
    aria-label="Overview"
    className="grid gap-6 rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-amber-50/70 to-emerald-50/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center dark:border-amber-900/60 dark:from-amber-950/30 dark:via-stone-950 dark:to-emerald-950/20"
  >
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-300">
        A Scout demo
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        Search that says what it knows
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
        Outpost is a small outdoor store searched through Scout. One typed
        search runs on four engines inside this page, your API, Orama,
        MiniSearch and Fuse.js, and six more show exactly what they would be
        sent. Nothing leaves your browser.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => scrollToElement("store")}
          className={buttonStyles({ variant: "primary" })}
        >
          <MagnifyingGlass aria-hidden="true" size={16} weight="bold" />
          Search the store
        </button>
        <button
          type="button"
          onClick={() => scrollToElement("lab")}
          className={buttonStyles({ variant: "ghost" })}
        >
          <Flask aria-hidden="true" size={16} weight="bold" />
          Open the lab
        </button>
      </div>
    </div>
    <ol aria-label="How to use this page" className="flex flex-col gap-2.5">
      <HeroStep
        number={1}
        title="Search the store"
        description="Every control builds one typed search, and the code beside the store is the search that ran."
      />
      <HeroStep
        number={2}
        title="Swap the engine"
        description="The same search runs on another engine, which answers or refuses, and never pretends."
      />
      <HeroStep
        number={3}
        title="Break the engine"
        description="Slow your API down, take it offline or make it guess. Every number says how sure it is."
      />
    </ol>
  </section>
);
