<script lang="ts">
  import { copy } from '../copy';
  import type { Status } from '../core/status';
  import Icon from './Icon.svelte';

  let { status }: { status: Status } = $props();

  const tone = $derived(status.colour === 'amber' ? (status.canGenerate ? 'caution' : 'pending') : status.colour);
  const label = $derived(
    status.colour === 'red'
      ? copy.band.labels.red
      : status.colour === 'green'
        ? copy.band.labels.green
        : status.canGenerate
          ? copy.band.labels.caution
          : copy.band.labels.notReady,
  );
  const text = $derived(status.colour === 'green' ? copy.band.green : copy.band[status.reason]);
  const icon = $derived(tone === 'red' ? 'hold' : tone === 'green' ? 'ready' : tone);
</script>

<div class="band {status.colour}" role="status" data-testid="status-band">
  <span class="icon"><Icon name={icon} size={28} /></span>
  <p>
    <strong>{label}.</strong>
    {text}
    {#if status.colour === 'green'}<span class="note">{copy.band.greenNote}</span>{/if}
  </p>
</div>

<style>
  .band {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
    padding: 0.85rem 1.1rem;
    border: 2px solid;
    border-radius: var(--radius);
    font-size: 1rem;
    line-height: 1.45;
  }
  .band p {
    margin: 0.15rem 0 0;
    max-width: 62ch;
  }
  .icon {
    flex: none;
    display: flex;
  }
  .red {
    color: var(--red);
    background: var(--red-bg);
  }
  .amber {
    color: var(--amber);
    background: var(--amber-bg);
  }
  .green {
    color: var(--green);
    background: var(--green-bg);
  }
  strong {
    font-weight: 800;
  }
  /* Information, not a warning: neutral ink on its own line. */
  .note {
    display: block;
    margin-top: 0.35rem;
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
</style>
