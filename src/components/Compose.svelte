<script lang="ts">
  import { tick } from 'svelte';
  import { copy, guidanceFor } from '../copy';
  import type { Status } from '../core/status';
  import {
    canCombine,
    canRemoveWord,
    canSplit,
    combine,
    CONNECTORS,
    drawFrom,
    drawsInPhrase,
    edit,
    generate,
    hasEdits,
    insertConnector,
    insertOwn,
    intactRandomWords,
    move,
    origin,
    phraseText,
    removeAdded,
    removeWord,
    reset,
    SEPARATORS,
    setSeparator,
    split,
    wordError,
    wordLimit,
    type Connector,
    type Phrase,
    type Separator,
    type Token,
    type WordError,
  } from '../core/phrase';
  import type { Rules } from '../core/policy';
  import Icon from './Icon.svelte';
  import Requirements from './Requirements.svelte';
  import WarnDialog from './WarnDialog.svelte';

  let {
    words,
    status,
    phrase = $bindable(),
    rules = $bindable(),
    onback,
    oncontinue,
    ondrawfailed,
  }: {
    words: string[];
    status: Status;
    phrase: Phrase;
    rules: Rules;
    onback: () => void;
    oncontinue: () => void;
    ondrawfailed: () => void;
  } = $props();

  // Something being moved: an existing token, or a connector taken from the tray.
  type Item = { kind: 'token'; id: string } | { kind: 'connector'; text: Connector };

  let placing = $state<Item | null>(null); // selected by a tap, click or Enter; placed with a "here" button
  let dragging = $state<Item | null>(null);
  let dropAt = $state<number | null>(null);
  let errors = $state<Record<string, WordError>>({});
  let announcement = $state('');
  let freshOpen = $state(false);
  let version = $state(0); // bumped on Reset so word fields show the restored text even after an invalid edit
  let list: HTMLOListElement;
  let previewBox: HTMLElement;
  let previewInView = $state(true);

  // The phone summary bar appears only while the main preview is scrolled out of view.
  $effect(() => {
    const observer = new IntersectionObserver(([entry]) => (previewInView = entry.isIntersecting));
    observer.observe(previewBox);
    return () => observer.disconnect();
  });
  // Focus and scrolling stop below the bar, however many lines the phrase wraps to. On phones the bar
  // is laid out even while invisible, so its height is known the moment it appears (0 on wider screens).
  let barHeight = $state(0);
  $effect(() => {
    document.documentElement.style.scrollPaddingTop = !previewInView && barHeight ? `${barHeight + 8}px` : '';
    return () => (document.documentElement.style.scrollPaddingTop = '');
  });
  let pointerStart = { x: 0, y: 0, moved: false };
  let pointer = $state({ x: 0, y: 0 });
  let ghost = $state<HTMLElement>();
  let removing = $state<Token | null>(null); // a word waiting for the remove confirmation

  // While dragging, the other tiles make room live: CSS order shows the drop result without moving DOM
  // nodes, which would release the pointer capture mid-drag. A copy of the word follows the pointer.
  const draggedId = $derived(dragging?.kind === 'token' ? dragging.id : null);
  const dragOrder = $derived.by(() => {
    if (!dragging || dropAt === null) return null;
    const ids = phrase.tokens.map((t) => t.id).filter((id) => id !== draggedId);
    ids.splice(dropAt, 0, draggedId ?? 'new-connector');
    return new Map(ids.map((id, i) => [id, i]));
  });
  const ghostText = $derived(dragging?.kind === 'connector' ? dragging.text : phrase.tokens.find((t) => t.id === draggedId)?.text);
  $effect(() => {
    if (!ghost) return;
    ghost.style.left = `${pointer.x}px`;
    ghost.style.top = `${pointer.y}px`;
  });

  const text = $derived(phraseText(phrase));
  const intact = $derived(intactRandomWords(phrase));
  const connectorCount = $derived(phrase.tokens.filter((t) => t.kind === 'connector').length);
  const ownCount = $derived(phrase.tokens.filter((t) => t.kind === 'own').length);
  let ownDraft = $state('');
  let ownError = $state<WordError | null>(null);

  // Your own word goes in at the end; from there it moves like any tile and never counts as random.
  function addOwn() {
    ownError = wordError(ownDraft);
    if (ownError) return;
    phrase = insertOwn(phrase, ownDraft, phrase.tokens.length);
    announcement = copy.compose.ownAdded(ownDraft);
    ownDraft = '';
  }
  const guidance = $derived(guidanceFor(intact));
  const separators = Object.keys(SEPARATORS) as Separator[];
  const sameItem = (a: Item | null, b: Item) =>
    !!a && a.kind === b.kind && (a.kind === 'token' ? a.id === (b as typeof a).id : a.text === (b as typeof a).text);
  const drawn = $derived(drawsInPhrase(phrase));
  const indexOf = (id: string) => phrase.tokens.findIndex((t) => t.id === id);

  async function place(item: Item, at: number) {
    placing = null;
    if (item.kind === 'connector') {
      phrase = insertConnector(phrase, item.text, at);
      return;
    }
    const from = indexOf(item.id);
    const to = at > from ? at - 1 : at;
    phrase = move(phrase, item.id, to);
    announcement = copy.compose.moved(phrase.tokens[to].text, to + 1, phrase.tokens.length);
    await tick();
    list.querySelector<HTMLElement>(`[data-handle="${item.id}"]`)?.focus();
  }

  // Where a pointer at (x, y) would insert: the number of other tiles before it in reading order. Over the
  // placeholder itself nothing changes, so the tiles that move to make room cannot flip the answer back.
  function indexAt(x: number, y: number) {
    const holder = list.querySelector<HTMLElement>(':scope > li.placeholder')?.getBoundingClientRect();
    if (holder && x >= holder.left && x <= holder.right && y >= holder.top && y <= holder.bottom) return dropAt;
    let i = 0;
    for (const el of list.querySelectorAll<HTMLElement>(':scope > li.token:not(.placeholder)')) {
      if (el.dataset.id === draggedId) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < y || (r.top <= y && r.left + r.width / 2 < x)) i++;
    }
    return i;
  }

  function pointerDown(e: PointerEvent, item: Item) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart = { x: e.clientX, y: e.clientY, moved: false };
    dragging = item;
  }

  function pointerMove(e: PointerEvent) {
    if (!dragging) return;
    if (!pointerStart.moved && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) < 6) return;
    pointerStart.moved = true;
    pointer = { x: e.clientX, y: e.clientY };
    dropAt = indexAt(e.clientX, e.clientY);
  }

  // A drag places the item; a tap without movement selects it instead (the single-pointer route).
  function pointerUp() {
    const item = dragging;
    const at = dropAt;
    dragging = null;
    dropAt = null;
    if (!item) return;
    if (!pointerStart.moved || at === null) placing = sameItem(placing, item) ? null : item;
    else if (item.kind === 'connector') place(item, at);
    else place(item, at >= indexOf(item.id) ? at + 1 : at); // at is the final position; place takes a gap
  }

  function cancelDrag() {
    dragging = null;
    dropAt = null;
  }

  // Keyboard activation (click with detail 0) selects for placing; pointer taps are handled above.
  function keyActivate(e: MouseEvent, item: Item) {
    if (e.detail === 0) placing = sameItem(placing, item) ? null : item;
  }

  function moveKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Escape') placing = null;
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const to = indexOf(id) + step;
    if (to < 0 || to >= phrase.tokens.length) return;
    place({ kind: 'token', id }, step > 0 ? to + 1 : to);
  }

  function onInput(e: Event, id: string) {
    const value = (e.currentTarget as HTMLInputElement).value;
    const error = wordError(value, wordLimit(phrase.tokens[indexOf(id)]));
    if (error) {
      errors = { ...errors, [id]: error };
      return;
    }
    const { [id]: _, ...rest } = errors;
    errors = rest;
    phrase = edit(phrase, id, value);
  }

  // Joining, splitting and removing replace tokens, so a selection pointing at them is cleared.
  function change(next: Phrase) {
    placing = null;
    phrase = next;
  }

  function resetChanges() {
    phrase = reset(phrase);
    errors = {};
    placing = null;
    version++;
  }

  function startFresh() {
    freshOpen = false;
    if (!status.canGenerate) return;
    try {
      phrase = generate(phrase.slots.length, drawFrom(words));
    } catch {
      ondrawfailed(); // the current phrase stays; Generate explains and offers the retry
      return;
    }
    errors = {};
    onback();
  }

  // Positions offered while placing; the spots right around a moving token would not change anything.
  function gapUseful(at: number) {
    if (!placing || placing.kind === 'connector') return true;
    const from = indexOf(placing.id);
    return at !== from && at !== from + 1;
  }

  function gapLabel(at: number) {
    if (!placing) return '';
    if (placing.kind === 'connector') return copy.compose.insertHere(placing.text, at + 1);
    return copy.compose.moveHere((at > indexOf(placing.id) ? at - 1 : at) + 1);
  }
</script>

<!-- Phones only: a slim copy of the exact string while the preview is out of view. It reads the same
     phrase state, is hidden from screen readers (the preview is the accessible source) and sets the
     page's scroll padding to its height so focused fields are scrolled clear of it. -->
<div class="sticky-phrase" class:shown={!previewInView} bind:offsetHeight={barHeight} aria-hidden="true" data-testid="sticky-phrase">
  <span>{copy.compose.previewLabel}</span>
  <p>{text}</p>
</div>

<h1 id="page-title" tabindex="-1">{copy.compose.heading}</h1>
<p class="intro">{copy.compose.intro}</p>
<section class="preview" aria-labelledby="preview-title" bind:this={previewBox}>
  <h2 id="preview-title">{copy.compose.previewLabel}</h2>
  <p class="phrase" data-testid="phrase-preview">{text}</p>
  <p class="counts">{copy.compose.counts(intact, drawn, connectorCount, [...text].length, ownCount)}</p>
  <p class="guidance">{guidance}</p>
  {#if intact < drawn}<p class="note">{copy.compose.editedNote}</p>{/if}
  {#if /[^\x20-\x7e]/.test(text)}<p class="note warn">{copy.compose.keyboardNote}</p>{/if}
</section>
<fieldset class="separators">
  <legend>{copy.compose.separatorLegend}</legend>
  {#each separators as key (key)}
    <label>
      <input
        type="radio"
        name="separator"
        value={key}
        checked={phrase.separator === key}
        onchange={() => (phrase = setSeparator(phrase, key))}
      />
      {copy.compose.separators[key]}
    </label>
  {/each}
</fieldset>
<Requirements bind:phrase bind:rules />
<p class="help" id="move-help">{copy.compose.moveHelp}</p>

{#if placing}
  <p class="placing" role="status">
    {placing.kind === 'connector'
      ? copy.compose.placingConnector(placing.text)
      : copy.compose.placingWord(phrase.tokens[indexOf(placing.id)]?.text ?? '')}
    <button class="link" onclick={() => (placing = null)}>{copy.compose.cancelPlacing}</button>
  </p>
{/if}

<ol class="tokens" bind:this={list} aria-label={copy.compose.tilesLabel}>
  {#each phrase.tokens as token, i (token.id + ':' + version)}
    {@const o = origin(phrase, token)}
    {@const item: Item = { kind: 'token', id: token.id }}
    {#if placing && gapUseful(i)}
      <li class="gap"><button onclick={() => place(placing!, i)}>{gapLabel(i)}</button></li>
    {/if}
    <li
      class="token {token.kind} origin-{o}"
      class:wide={[...token.text].length > 10}
      class:selected={sameItem(placing, item)}
      class:placeholder={dragOrder !== null && token.id === draggedId}
      style:order={dragOrder?.get(token.id)}
      data-id={token.id}
    >
      <div class="head">
        <button
          class="handle"
          data-handle={token.id}
          aria-label={copy.compose.handle(token.text)}
          aria-describedby="move-help"
          aria-pressed={sameItem(placing, item)}
          onpointerdown={(e) => pointerDown(e, item)}
          onpointermove={pointerMove}
          onpointerup={pointerUp}
          onpointercancel={cancelDrag}
          onclick={(e) => keyActivate(e, item)}
          onkeydown={(e) => moveKey(e, token.id)}
        >
          <Icon name="grip" size={20} />
        </button>
        <span class="origin">{copy.compose.origin[o]}</span>
        {#if token.kind === 'word' && canRemoveWord(phrase)}
          <button class="remove-word" aria-label={copy.compose.remove(token.text)} onclick={() => (removing = token)}>
            <Icon name="close" size={16} />
          </button>
        {/if}
      </div>

      {#if token.kind === 'word'}
        <input
          value={token.text}
          aria-label="{copy.compose.wordLabel(i + 1)}, {copy.compose.origin[o]}"
          aria-invalid={errors[token.id] ? 'true' : undefined}
          aria-describedby={errors[token.id] ? `err-${token.id}` : undefined}
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          oninput={(e) => onInput(e, token.id)}
        />
        {#if errors[token.id]}<p class="error" id="err-{token.id}">{copy.compose.wordErrors[errors[token.id]]}</p>{/if}
        <div class="actions">
          {#if canSplit(phrase, token.id)}
            <button class="small" aria-label="{copy.compose.split}: {token.text}" onclick={() => change(split(phrase, token.id))}>
              {copy.compose.split}
            </button>
          {/if}
          {#if canCombine(phrase, token.id)}
            <button class="small" aria-label="{copy.compose.join}: {token.text}" onclick={() => change(combine(phrase, token.id))}>
              {copy.compose.join}
            </button>
          {/if}
        </div>
      {:else if token.kind === 'own'}
        <input
          value={token.text}
          aria-label="{copy.compose.wordLabel(i + 1)}, {copy.compose.origin[o]}"
          aria-invalid={errors[token.id] ? 'true' : undefined}
          aria-describedby={errors[token.id] ? `err-${token.id}` : undefined}
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          oninput={(e) => onInput(e, token.id)}
        />
        {#if errors[token.id]}<p class="error" id="err-{token.id}">{copy.compose.wordErrors[errors[token.id]]}</p>{/if}
        <div class="actions">
          <button class="small" aria-label={copy.compose.remove(token.text)} onclick={() => change(removeAdded(phrase, token.id))}>
            <Icon name="close" size={16} />
            {copy.compose.remove('')}
          </button>
        </div>
      {:else}
        <span class="connector-text">{token.text}</span>
        <div class="actions">
          <button class="small" aria-label={copy.compose.remove(token.text)} onclick={() => change(removeAdded(phrase, token.id))}>
            <Icon name="close" size={16} />
            {copy.compose.remove('')}
          </button>
        </div>
      {/if}
    </li>
  {/each}
  {#if placing && gapUseful(phrase.tokens.length)}
    <li class="gap">
      <button onclick={() => place(placing!, phrase.tokens.length)}>{gapLabel(phrase.tokens.length)}</button>
    </li>
  {/if}
  {#if dragOrder && dragging?.kind === 'connector'}
    <li class="token connector placeholder" style:order={dragOrder.get('new-connector')} aria-hidden="true">
      <span class="connector-text">{dragging.text}</span>
    </li>
  {/if}
</ol>
{#if dragOrder}<div class="ghost" bind:this={ghost} aria-hidden="true">{ghostText}</div>{/if}
<p class="visually-hidden" aria-live="polite">{announcement}</p>

<section class="tray" aria-labelledby="tray-title">
  <h2 id="tray-title">{copy.compose.connectorsTitle}</h2>
  <ul>
    {#each CONNECTORS as c (c)}
      {@const item: Item = { kind: 'connector', text: c }}
      <li>
        <button
          class="chip"
          aria-pressed={sameItem(placing, item)}
          aria-describedby="tray-help"
          onpointerdown={(e) => pointerDown(e, item)}
          onpointermove={pointerMove}
          onpointerup={pointerUp}
          onpointercancel={cancelDrag}
          onclick={(e) => keyActivate(e, item)}
        >
          {c}
        </button>
      </li>
    {/each}
  </ul>
  <p id="tray-help">{copy.compose.connectorsHelp}</p>
  <div class="own-add">
    <label for="own-word">{copy.compose.ownLabel}</label>
    <input
      id="own-word"
      bind:value={ownDraft}
      aria-describedby="own-help{ownError ? ' own-error' : ''}"
      aria-invalid={ownError ? 'true' : undefined}
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      oninput={() => (ownError = null)}
      onkeydown={(e) => e.key === 'Enter' && addOwn()}
    />
    <button class="small" onclick={addOwn} disabled={!ownDraft}>{copy.compose.ownAdd}</button>
  </div>
  {#if ownError}<p class="error" id="own-error">{copy.compose.wordErrors[ownError]}</p>{/if}
  <p id="own-help">{copy.compose.ownHelp}</p>
</section>

<div class="footer">
  <button class="button secondary" onclick={onback}>
    <Icon name="back" />
    {copy.compose.back}
  </button>
  <!-- Invalid input waiting in a field also counts as a change to undo. -->
  <button class="button secondary" onclick={resetChanges} disabled={!hasEdits(phrase) && Object.keys(errors).length === 0}>
    {copy.compose.reset}
  </button>
  <button class="button secondary" onclick={() => (freshOpen = true)} disabled={!status.canGenerate}>{copy.compose.startFresh}</button>
  <button class="button primary" onclick={oncontinue}>
    {copy.compose.continue}
    <Icon name="forward" />
  </button>
</div>

<WarnDialog
  open={removing !== null}
  title={removing ? copy.warn.removeTitle(removing.text) : ''}
  body={copy.warn.removeBody}
  confirmLabel={copy.warn.removeConfirm}
  onconfirm={() => {
    const { [removing!.id]: _, ...rest } = errors;
    errors = rest;
    change(removeWord(phrase, removing!.id));
    removing = null;
  }}
  oncancel={() => (removing = null)}
/>

<WarnDialog
  open={freshOpen}
  title={copy.warn.freshTitle}
  body={copy.warn.freshBody}
  confirmLabel={copy.warn.freshConfirm}
  onconfirm={startFresh}
  oncancel={() => (freshOpen = false)}
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
    margin: 0.4rem 0 0.3rem;
    font-size: 1.1rem;
    color: var(--ink-soft);
  }
  .help {
    margin: 0;
    font-size: 0.95rem;
    color: var(--ink-soft);
  }
  .placing {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin: 0.8rem 0 0;
    padding: 0.6rem 0.9rem;
    border-radius: var(--radius);
    background: var(--navy-900);
    color: #fff;
    font-weight: 650;
  }
  .link {
    border: none;
    background: none;
    color: var(--yellow);
    font-weight: 750;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  .tokens {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 0.7rem;
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }
  .token {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.4rem 0.55rem 0.5rem;
    border: 1px solid var(--cream-line);
    border-radius: 14px;
    background: var(--cream);
    transition: box-shadow 140ms;
  }
  /* Long words get two columns so the whole word stays visible in its field. */
  .token.wide {
    grid-column: span 2;
  }
  .token.connector {
    border-style: dashed;
    background: #f1f3f8;
  }
  .token.own {
    border-style: dotted;
    border-width: 2px;
    background: var(--paper);
  }
  .token.origin-edited,
  .token.origin-rewritten {
    background: var(--paper);
  }
  .token.selected {
    border: 2px solid var(--navy-900);
  }
  /* Where the dragged word will land: an empty outline the other tiles make room for. */
  .token.placeholder {
    border: 2px dashed var(--navy-700);
    background: var(--paper);
  }
  .token.placeholder > * {
    visibility: hidden;
  }
  .token.connector.placeholder > * {
    visibility: visible;
    opacity: 0.6;
  }
  .ghost {
    position: fixed;
    z-index: 10;
    transform: translate(-50%, -130%);
    padding: 0.45rem 0.85rem;
    border-radius: 12px;
    background: var(--navy-900);
    color: #fff;
    font-weight: 750;
    box-shadow: 0 12px 24px -10px rgb(3 8 24 / 0.7);
    pointer-events: none;
    white-space: nowrap;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2rem;
  }
  .handle {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--ink-soft);
    cursor: grab;
    touch-action: none;
  }
  .handle:hover,
  .handle[aria-pressed='true'] {
    background: rgb(14 27 58 / 0.08);
  }
  .origin {
    font-size: 0.78rem;
    font-weight: 750;
    color: var(--ink-soft);
  }
  .origin-edited .origin,
  .origin-rewritten .origin {
    color: var(--navy-900);
    text-decoration: underline 2px var(--yellow-deep);
    text-underline-offset: 3px;
  }
  .remove-word {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    margin-left: auto;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .remove-word:hover {
    background: var(--paper);
    color: var(--ink);
  }
  input {
    width: 100%;
    min-width: 0;
    padding: 0.35rem 0.45rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: rgb(255 255 255 / 0.7);
    font-size: 1.25rem;
    font-weight: 800;
  }
  input:hover {
    border-color: var(--cream-line);
  }
  input[aria-invalid='true'] {
    border-color: var(--red);
  }
  .connector-text {
    padding: 0.35rem 0.45rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .error {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--red);
  }
  .actions {
    display: flex;
    min-height: 1.9rem;
  }
  .small {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.55rem;
    border: 1px solid var(--cream-line);
    border-radius: 8px;
    background: var(--paper);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }
  .gap button {
    width: 100%;
    height: 100%;
    min-height: 3rem;
    border: 2px dashed var(--navy-700);
    border-radius: 14px;
    background: rgb(254 212 0 / 0.18);
    font-size: 0.85rem;
    font-weight: 750;
    cursor: pointer;
  }

  .tray {
    margin-top: 1rem;
  }
  .tray h2,
  .preview h2 {
    margin: 0 0 0.4rem;
    font-size: 1rem;
  }
  .tray ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chip {
    min-height: 2.25rem;
    padding: 0.2rem 0.8rem;
    border: 1px dashed var(--navy-700);
    border-radius: 999px;
    background: #f1f3f8;
    font-weight: 700;
    cursor: grab;
    touch-action: none;
  }
  .chip[aria-pressed='true'] {
    border-style: solid;
    background: var(--navy-900);
    color: #fff;
  }
  .own-add {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }
  .own-add label {
    font-weight: 700;
  }
  .own-add input {
    flex: 1 1 10rem;
    min-width: 0;
    min-height: 2.5rem;
    padding: 0 0.6rem;
    border: 2px solid var(--cream-line);
    border-radius: 10px;
    background: #fff;
    font-size: 1rem;
  }
  .tray p {
    margin: 0.4rem 0 0;
    font-size: 0.88rem;
    color: var(--ink-soft);
  }

  .separators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0.7rem 0 0.9rem;
    padding: 0;
    border: none;
  }
  .separators legend {
    float: left;
    margin-right: 0.5rem;
    font-weight: 700;
  }
  .separators label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .separators input {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--navy-900);
  }

  .preview {
    margin-top: 0.8rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
    background: var(--navy-900);
    color: #fff;
  }
  .preview h2 {
    color: var(--yellow);
  }
  .phrase {
    margin: 0;
    font-size: clamp(1.3rem, 2.4vw, 1.7rem);
    font-weight: 750;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .counts,
  .guidance,
  .note {
    margin: 0.45rem 0 0;
    font-size: 0.92rem;
    color: #d5dcec;
  }
  .warn {
    color: var(--yellow);
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .sticky-phrase {
    display: none;
  }

  @media (max-width: 600px) {
    .sticky-phrase {
      visibility: hidden;
      display: block;
      position: fixed;
      z-index: 5;
      top: 0;
      left: 0;
      right: 0;
      padding: calc(0.45rem + env(safe-area-inset-top)) 1rem 0.5rem;
      background: var(--navy-900);
      color: #fff;
      box-shadow: 0 6px 16px -10px rgb(3 8 24 / 0.8);
    }
    .sticky-phrase.shown {
      visibility: visible;
    }
    .sticky-phrase span {
      font-size: 0.75rem;
      font-weight: 750;
      color: var(--yellow);
    }
    .sticky-phrase p {
      margin: 0.1rem 0 0;
      font-size: 0.98rem;
      font-weight: 750;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .tokens {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .token {
      transition: none;
    }
  }
</style>
