<script lang="ts">
  import { iconTileStyles } from "examples/shared/ui/styles/iconTileStyles";
  import type { IconSize } from "examples/shared/ui/types/IconSize";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";

  type TileSize = "large" | "regular" | "small";

  type Props = { icon: string; size: TileSize };

  const ICON_SIZES: Record<TileSize, IconSize> = {
    large: "xlarge",
    regular: "large",
    small: "regular",
  };

  let { icon, size }: Props = $props();
</script>

<span aria-hidden="true" class={iconTileStyles({ size })}>
  <BaseIcon src={icon} size={ICON_SIZES[size]} />
</span>
