<script lang="ts">
  import { copy } from '../copy';

  let { open, onskip }: { open: boolean; onskip: () => void } = $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<!-- Escape counts as Skip, so the check can always be dismissed from the keyboard. -->
<dialog
  bind:this={dialog}
  aria-labelledby="confirm-title"
  aria-describedby="confirm-note"
  oncancel={(e) => {
    e.preventDefault();
    onskip();
  }}
>
  <span class="spinner" aria-hidden="true"></span>
  <h2 id="confirm-title">{copy.dialog.title}</h2>
  <p id="confirm-note">{copy.dialog.note}</p>
  <button class="button secondary" onclick={onskip}>{copy.dialog.skip}</button>
</dialog>

<style>
  dialog {
    width: min(26rem, calc(100vw - 2rem));
    padding: 1.75rem 1.75rem 1.5rem;
    border: none;
    border-radius: var(--radius-card);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-card);
    text-align: center;
  }
  dialog::backdrop {
    background: rgb(8 18 42 / 0.72);
  }
  h2 {
    margin: 0.9rem 0 0.4rem;
    font-size: 1.4rem;
    letter-spacing: -0.01em;
  }
  p {
    margin: 0 0 1.25rem;
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .spinner {
    display: inline-block;
    width: 2.75rem;
    height: 2.75rem;
    border: 4px solid var(--cream-line);
    border-top-color: var(--navy-900);
    border-radius: 50%;
    animation: spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: var(--cream-line);
      border-style: dotted;
    }
  }
</style>
