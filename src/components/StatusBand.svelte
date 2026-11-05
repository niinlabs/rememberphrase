<script lang="ts">
  import { copy } from '../copy';
  import type { Status } from '../core/status';
  import Icon from './Icon.svelte';

  // compact: a one-line form once words exist and drawing is allowed. It keeps a visible reason and
  // the full explanation under Details; blocking states always use the full band.
  let { status, compact = false }: { status: Status; compact?: boolean } = $props();

  const tone = $derived(status.colour === 'amber' ? (status.canGenerate ? 'caution' : 'pending') : status.colour);
  const label = $derived(
    status.colour === 'red'
      ? status.canGenerate
        ? copy.band.labels.continued
        : copy.band.labels.red
      : status.colour === 'green'
        ? copy.band.labels.green
        : status.canGenerate
          ? copy.band.labels.caution
          : copy.band.labels.notReady,
  );
  const text = $derived(status.colour === 'green' ? copy.band.green : copy.band[status.reason]);
  const icon = $derived(tone === 'red' ? 'hold' : tone === 'green' ? 'ready' : tone);
  const short = $derived(
    status.colour === 'green' ? copy.chip.green : status.canGenerate ? copy.chip[status.reason] : copy.chip.notReady,
  );
</script>

{#if compact && status.canGenerate}
  <div class="band compact {status.colour}" role="status" data-testid="status-band">
    <span class="icon"><Icon name={icon} size={20} /></span>
    <p><strong>{label}.</strong> {short}</p>
    <details>
      <summary>{copy.band.details}</summary>
      <p>
        {text}
        {#if status.colour === 'green'}<span class="note">{copy.band.greenNote}</span>{/if}
      </p>
    </details>
  </div>
{:else}
  <div class="band {status.colour}" role="status" data-testid="status-band">
    <span class="icon"><Icon name={icon} size={28} /></span>
    <p>
      <strong>{label}.</strong>
      {text}
      {#if status.colour === 'green'}<span class="note">{copy.band.greenNote}</span>{/if}
    </p>
  </div>
{/if}

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
  .compact {
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.6rem;
    padding: 0.45rem 0.85rem;
    border-width: 1.5px;
    font-size: 0.95rem;
  }
  .compact > p {
    margin: 0;
  }
  details {
    margin-left: auto;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  details[open] {
    flex-basis: 100%;
    margin-left: 0;
  }
  details p {
    margin: 0.4rem 0 0.1rem;
  }
  /* Information, not a warning: neutral ink on its own line. */
  .note {
    display: block;
    margin-top: 0.35rem;
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
</style>
