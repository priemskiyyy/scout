import type { Component } from "solid-js";

export const Footer: Component = () => (
  <footer class="border-t border-stone-200/70 dark:border-stone-800">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-8 text-sm text-stone-500 sm:px-6">
      <span>
        Every engine runs inside this page, so nothing leaves your browser.
      </span>
      <a
        href="https://github.com/priemskiyyy/scout"
        class="underline-offset-2 hover:underline sm:ml-auto"
      >
        Scout on GitHub
      </a>
    </div>
  </footer>
);
