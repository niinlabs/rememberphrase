<script lang="ts">
  import { copy } from '../copy';

  let {
    open,
    title,
    body,
    confirmLabel,
    onconfirm,
    oncancel,
  }: { open: boolean; title: string; body: string; confirmLabel: string; onconfirm: () => void; oncancel: () => void } =
    $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<!-- Focus starts on the safe choice; Escape keeps the phrase. -->
<dialog
  bind:this={dialog}
  role="alertdialog"
  aria-labelledby="warn-title"
  aria-describedby="warn-body"
  oncancel={(e) => {
    e.preventDefault();
    oncancel();
  }}
>
  <h2 id="warn-title">{title}</h2>
  <p id="warn-body">{body}</p>
  <div class="buttons">
    <!-- svelte-ignore a11y_autofocus -->
    <button class="button secondary" onclick={oncancel} autofocus>{copy.warn.cancel}</button>
    <button class="button primary" onclick={onconfirm}>{confirmLabel}</button>
  </div>
</dialog>

<style>
  dialog {
    width: min(28rem, calc(100vw - 2rem));
    padding: 1.6rem;
    border: none;
    border-radius: var(--radius-card);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-card);
  }
  dialog::backdrop {
    background: rgb(8 18 42 / 0.72);
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
  }
  p {
    margin: 0 0 1.25rem;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.6rem;
  }
</style>
