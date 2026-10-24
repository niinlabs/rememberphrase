<script lang="ts">
  // One authored line-icon set: 24px grid, 2px round strokes, currentColor.
  const paths = {
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    hold: ['M12 3.5 2.5 20h19L12 3.5z', 'M12 10v4.5', 'M12 17.5v.01'],
    pending: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5v5l3 2'],
    caution: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5v5.5', 'M12 16.5v.01'],
    ready: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12.5l2.7 2.7L16 9.8'],
    offline: ['M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', 'M12 19.5v.01', 'M3 3l18 18'],
  };
  let { name, size = 24 }: { name: keyof typeof paths; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#each paths[name] as d (d)}<path {d} />{/each}
</svg>
