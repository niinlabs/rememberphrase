<script lang="ts">
  import { copy } from '../copy';
  import type { Status } from '../core/status';
  import {
    canReroll,
    hasEdits,
    DEFAULT_WORDS,
    drawFrom,
    duplicates,
    generate,
    intactRandomWords,
    MAX_WORDS,
    MIN_WORDS,
    reroll,
    setCount,
    toggleLock,
    unlockAll,
    unlocksNeeded,
    type Phrase,
  } from '../core/phrase';
  import Icon from './Icon.svelte';
  import StatusBand from './StatusBand.svelte';
  import WarnDialog from './WarnDialog.svelte';

  let {
    words,
    status,
    phrase = $bindable(),
    onback,
    oncontinue,
    ondrawfailed,
    onretry,
  }: {
    words: string[];
    status: Status;
    phrase: Phrase | null;
    onback: () => void;
    oncontinue: () => void;
    ondrawfailed: () => void;
    onretry: () => void;
  } = $props();

  // A draw either completes or leaves the phrase as it was; a failure holds further draws.
  function attempt(action: () => void) {
    try {
      action();
    } catch {
      ondrawfailed();
    }
  }

  // An upstream change that would discard the arranged phrase waits here until the user confirms.
  let pendingDiscard = $state<(() => void) | null>(null);
  const guardEdits = (action: () => void) => (phrase && hasEdits(phrase) ? (pendingDiscard = action) : action());

  let pendingCount = $state(DEFAULT_WORDS);
  let countMessage = $state('');

  const draw = $derived(drawFrom(words));
  const count = $derived(phrase ? phrase.slots.length : pendingCount);
  const lockedCount = $derived(phrase ? phrase.slots.filter((s) => s.locked).length : 0);
  const intact = $derived(phrase ? intactRandomWords(phrase) : count);
  const guidance = $derived(
    intact <= 3 ? copy.generate.guidance.tooFew : intact <= 5 ? copy.generate.guidance.short : copy.generate.guidance.recommended,
  );
  const dupes = $derived(phrase ? duplicates(phrase) : new Set<string>());
  const primaryLabel = $derived(
    !phrase ? copy.generate.generate : lockedCount === 0 ? copy.generate.newWords : copy.generate.reroll(count - lockedCount),
  );

  // Every draw checks the connection status at the moment of the click (D7).
  function primary() {
    guardEdits(() => {
      if (status.canGenerate) attempt(() => (phrase = phrase ? reroll(phrase!, draw) : generate(pendingCount, draw)));
    });
  }

  // D5: raising draws new words (so it is gated); lowering never removes a locked word.
  function changeCount(next: number) {
    countMessage = '';
    if (!phrase) {
      pendingCount = next;
      return;
    }
    const needed = unlocksNeeded(phrase, next);
    if (needed > 0) countMessage = copy.generate.unlocksNeeded(needed, next);
    else
      guardEdits(() => {
        if (next < phrase!.slots.length || status.canGenerate) attempt(() => (phrase = setCount(phrase!, next, draw)));
      });
  }
</script>

<h1 id="page-title" tabindex="-1">{copy.generate.heading}</h1>
<p class="intro">{copy.generate.intro}</p>

<StatusBand {status} compact={phrase !== null} />
{#if status.colour === 'amber' && !status.canGenerate && status.reason === 'local-check-failed'}
  <button class="button primary retry" onclick={onretry}>{copy.offline.retryCheck}</button>
{/if}

<div class="count-row">
  <span class="count-label" id="count-label">{copy.generate.countLabel}</span>
  <div class="counter" role="group" aria-labelledby="count-label">
    <button class="step" onclick={() => changeCount(count - 1)} disabled={count <= MIN_WORDS} aria-label={copy.generate.fewer}>
      <Icon name="minus" size={20} />
    </button>
    <output aria-live="polite" aria-labelledby="count-label">{count}</output>
    <button
      class="step"
      onclick={() => changeCount(count + 1)}
      disabled={count >= MAX_WORDS || (phrase !== null && !status.canGenerate)}
      aria-label={copy.generate.more}
    >
      <Icon name="plus" size={20} />
    </button>
  </div>
  <p class="guidance">{guidance}</p>
</div>
{#if countMessage}<p class="message" role="status">{countMessage}</p>{/if}

{#if phrase}
  <ol class="tiles" aria-label={copy.generate.wordsLabel}>
    {#each phrase.slots as slot (slot.id)}
      <li class="tile" class:locked={slot.locked}>
        <span class="word">{slot.word}</span>
        {#if dupes.has(slot.word)}<span class="dupe">{copy.generate.duplicate}</span>{/if}
        <span class="tile-foot">
          {#if slot.locked}<span class="tag">{copy.generate.lockedTag}</span>{/if}
          <button
            class="lock"
            aria-pressed={slot.locked}
            aria-label={copy.generate.lock(slot.word)}
            onclick={() => (phrase = toggleLock(phrase!, slot.id))}
          >
            <Icon name={slot.locked ? 'lock' : 'unlock'} size={20} />
          </button>
        </span>
      </li>
    {/each}
  </ol>
{/if}

<div class="actions">
  <button class="button primary" onclick={primary} disabled={!status.canGenerate || (phrase !== null && !canReroll(phrase))}>
    <Icon name="shuffle" />
    {primaryLabel}
  </button>
  {#if lockedCount > 0}
    <button class="button secondary" onclick={() => (phrase = unlockAll(phrase!))}>{copy.generate.unlockAll}</button>
  {/if}
</div>
{#if phrase && !canReroll(phrase)}<p class="message">{copy.generate.allLocked}</p>{/if}

<div class="footer">
  <button class="button secondary" onclick={onback}>
    <Icon name="back" />
    {copy.generate.back}
  </button>
  {#if phrase}
    <button class="button primary" onclick={oncontinue}>
      {copy.generate.continue}
      <Icon name="forward" />
    </button>
  {/if}
</div>

<WarnDialog
  open={pendingDiscard !== null}
  title={copy.warn.discardTitle}
  body={copy.warn.discardBody}
  confirmLabel={copy.warn.discardConfirm}
  onconfirm={() => {
    const action = pendingDiscard;
    pendingDiscard = null;
    action?.();
  }}
  oncancel={() => (pendingDiscard = null)}
/>

<style>
  h1 {
    margin: 0;
    font-size: clamp(1.75rem, 3.2vw, 2.4rem);
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-wrap: balance;
  }
  h1:focus {
    outline: none;
  }
  .intro {
    margin: 0.4rem 0 1rem;
    font-size: 1.1rem;
    color: var(--ink-soft);
  }

  .retry {
    margin-top: 0.75rem;
  }
  .count-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-top: 1rem;
  }
  .count-label {
    font-weight: 700;
  }
  .counter {
    display: flex;
    align-items: center;
    border: 2px solid var(--cream-line);
    border-radius: var(--radius);
    background: var(--paper);
  }
  .step {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border: none;
    background: none;
    color: var(--ink);
    cursor: pointer;
  }
  .step:disabled {
    color: #9aa2b5;
    cursor: not-allowed;
  }
  output {
    min-width: 2.5rem;
    font-size: 1.3rem;
    font-weight: 800;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .guidance {
    margin: 0;
    flex: 1 1 18rem;
    color: var(--ink-soft);
  }
  .message {
    margin: 0.6rem 0 0;
    font-weight: 700;
    color: var(--navy-900);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.25rem, 1fr));
    gap: 0.7rem;
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 5.5rem;
    padding: 0.75rem 0.6rem 0.45rem 0.8rem;
    border: 1px solid var(--cream-line);
    border-radius: 14px;
    background: var(--cream);
  }
  .tile.locked {
    border: 2px solid var(--navy-900);
    background: #fff;
  }
  .word {
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    overflow-wrap: break-word; /* only breaks a word that cannot fit at all */
  }
  .tile-foot {
    display: flex;
    align-items: center;
    margin-top: auto;
  }
  .lock {
    display: grid;
    margin-left: auto;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 10px;
    background: none;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .lock:hover {
    background: rgb(14 27 58 / 0.07);
  }
  .tile.locked .lock {
    background: var(--navy-900);
    color: var(--yellow);
  }
  .tag {
    font-size: 0.8rem;
    font-weight: 750;
    color: var(--navy-900);
  }
  .dupe {
    font-size: 0.85rem;
    line-height: 1.3;
    color: var(--ink-soft);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.1rem;
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }

  @media (max-width: 600px) {
    .tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
