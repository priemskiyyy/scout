<script lang="ts">
  import { CODE_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
  import { BUILT_ON } from "src/utilities/constants/packages";
</script>

<footer class="border-t border-stone-200/70 dark:border-stone-800">
  <div
    class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:px-6"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
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
    <div class="flex flex-col gap-2">
      <span class="font-medium text-stone-600 dark:text-stone-400">
        Built on
      </span>
      <ul class="flex flex-wrap gap-1.5">
        {#each BUILT_ON as name (name)}
          <li class={CODE_CLASS_NAME}>{name}</li>
        {/each}
      </ul>
    </div>
  </div>
</footer>
