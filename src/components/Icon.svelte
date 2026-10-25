<script lang="ts">
  // One authored line-icon set: 24px grid, 2px round strokes, currentColor.
  const paths = {
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    hold: ['M12 3.5 2.5 20h19L12 3.5z', 'M12 10v4.5', 'M12 17.5v.01'],
    pending: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5v5l3 2'],
    caution: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5v5.5', 'M12 16.5v.01'],
    ready: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12.5l2.7 2.7L16 9.8'],
    offline: ['M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', 'M12 19.5v.01', 'M3 3l18 18'],
    lock: ['M7.5 11V8a4.5 4.5 0 0 1 9 0v3', 'M5.5 11h13v9.5h-13z', 'M12 15v2'],
    unlock: ['M7.5 11V8a4.5 4.5 0 0 1 8.7-1.6', 'M5.5 11h13v9.5h-13z', 'M12 15v2'],
    shuffle: ['M3 7h3c3.5 0 5.5 10 9 10h6', 'M3 17h3c3.5 0 5.5-10 9-10h6', 'M18 4l3 3-3 3', 'M18 14l3 3-3 3'],
    back: ['M15 5l-7 7 7 7'],
    minus: ['M5 12h14'],
    grip: ['M9 6v.01', 'M15 6v.01', 'M9 12v.01', 'M15 12v.01', 'M9 18v.01', 'M15 18v.01'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    plus: ['M12 5v14', 'M5 12h14'],
    forward: ['M9 5l7 7-7 7'],
    eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    'eye-off': [
      'M3 3l18 18',
      'M10.5 5.6A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.6',
      'M6.6 6.6C4 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.6-1.2',
      'M9.9 9.9a3 3 0 0 0 4.2 4.2',
    ],
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
