<script lang="ts">
  import { copy } from '../copy';
  import Icon from './Icon.svelte';

  let { open, reason, onacknowledge }: { open: boolean; reason: string; onacknowledge: () => void } = $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<!-- Acknowledging closes the explanation only; the red hold stays until a fresh check. Escape acknowledges too. -->
<dialog
  bind:this={dialog}
  role="alertdialog"
  aria-labelledby="alert-title"
  aria-describedby="alert-reason alert-next"
  oncancel={(e) => {
    e.preventDefault();
    onacknowledge();
  }}
>
  <span class="icon"><Icon name="hold" size={36} /></span>
  <h2 id="alert-title">{copy.interruption.title}</h2>
  <p id="alert-reason">{reason}</p>
  <p id="alert-next" class="next">{copy.interruption.next}</p>
  <button class="button primary" onclick={onacknowledge}>{copy.interruption.acknowledge}</button>
</dialog>

<style>
  dialog {
    width: min(28rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    padding: 1.75rem 1.75rem 1.5rem;
    border: 3px solid var(--red);
    border-radius: var(--radius-card);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-card);
    text-align: center;
  }
  dialog::backdrop {
    background: rgb(8 18 42 / 0.78);
  }
  .icon {
    display: inline-flex;
    color: var(--red);
  }
  h2 {
    margin: 0.5rem 0 0.6rem;
    font-size: 1.45rem;
    letter-spacing: -0.01em;
    color: var(--red);
  }
  p {
    margin: 0 0 0.8rem;
    line-height: 1.5;
  }
  .next {
    color: var(--ink-soft);
    margin-bottom: 1.25rem;
  }
</style>
