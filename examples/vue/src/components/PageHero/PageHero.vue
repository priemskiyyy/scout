<template>
  <section
    aria-label="Overview"
    class="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-amber-50/70 to-emerald-50/60 p-6 sm:p-8 dark:border-amber-900/60 dark:from-amber-950/30 dark:via-stone-950 dark:to-emerald-950/20"
  >
    <p
      class="font-mono text-sm font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-300"
    >
      A Scout demo on Vue
    </p>
    <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
      Search that says what it knows
    </h2>
    <p
      class="max-w-3xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400"
    >
      Outpost's store, written with Vue composables over TanStack Query's Vue
      binding. The same typed search runs on four engines inside this page, and
      the panel beside it shows the code that built it and how sure the engine
      was. The React example is the full tour: the dialects, the lab, query
      identity and the timeline.
    </p>
  </section>
</template>
