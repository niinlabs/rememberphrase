<script lang="ts">
  import { tick } from 'svelte';
  import { copy } from '../copy';
  import type { Status } from '../core/status';
  import {
    canCombine,
    canSplit,
    combine,
    CONNECTORS,
    drawFrom,
    edit,
    generate,
    hasEdits,
    insertConnector,
    intactRandomWords,
    move,
    origin,
    phraseText,
    removeConnector,
    reset,
    SEPARATORS,
    setSeparator,
    split,
    wordError,
    type Connector,
    type Phrase,
    type Separator,
    type Token,
    type WordError,
  } from '../core/phrase';
  import Icon from './Icon.svelte';
  import WarnDialog from './WarnDialog.svelte';

  let {
    words,
    status,
    phrase = $bindable(),
    onback,
  }: { words: string[]; status: Status; phrase: Phrase; onback: () => void } = $props();

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
  let pointerStart = { x: 0, y: 0, moved: false };

  const text = $derived(phraseText(phrase));
  const intact = $derived(intactRandomWords(phrase));
  const connectorCount = $derived(phrase.tokens.filter((t) => t.kind === 'connector').length);
  const guidance = $derived(
    intact <= 3 ? copy.generate.guidance.tooFew : intact <= 5 ? copy.generate.guidance.short : copy.generate.guidance.recommended,
  );
  const separators = Object.keys(SEPARATORS) as Separator[];
  const sameItem = (a: Item | null, b: Item) =>
    !!a && a.kind === b.kind && (a.kind === 'token' ? a.id === (b as typeof a).id : a.text === (b as typeof a).text);
  const isLocked = (t: Token) => t.kind === 'word' && t.slots.some((id) => phrase.slots.find((s) => s.id === id)?.locked);
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

  // Where a pointer at (x, y) would insert: the number of tiles before it in reading order.
  function indexAt(x: number, y: number) {
    let i = 0;
    for (const el of list.querySelectorAll<HTMLElement>(':scope > li.token')) {
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
    dropAt = indexAt(e.clientX, e.clientY);
  }

  // A drag places the item; a tap without movement selects it instead (the single-pointer route).
  function pointerUp() {
    const item = dragging;
    const at = dropAt;
    dragging = null;
    dropAt = null;
    if (!item) return;
    if (pointerStart.moved && at !== null) place(item, at);
    else placing = sameItem(placing, item) ? null : item;
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
    const error = wordError(value);
    if (error) {
      errors = { ...errors, [id]: error };
      return;
    }
    const { [id]: _, ...rest } = errors;
    errors = rest;
    phrase = edit(phrase, id, value);
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
    phrase = generate(phrase.slots.length, drawFrom(words));
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

<h1 id="page-title" tabindex="-1">{copy.compose.heading}</h1>
<p class="intro">{copy.compose.intro}</p>
<p class="help" id="move-help">{copy.compose.moveHelp}</p>

{#if placing}
  <p class="placing" role="status">
    {placing.kind === 'connector'
      ? copy.compose.placingConnector(placing.text)
      : copy.compose.placingWord(phrase.tokens[indexOf(placing.id)].text)}
    <button class="link" onclick={() => (placing = null)}>{copy.compose.cancelPlacing}</button>
  </p>
{/if}

<ol class="tokens" class:drop-end={dropAt === phrase.tokens.length} bind:this={list} aria-label={copy.compose.tilesLabel}>
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
      class:dragging={sameItem(dragging, item) && dropAt !== null}
      class:drop-before={dropAt === i}
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
        {#if isLocked(token)}
          <span class="locked"><Icon name="lock" size={16} /><span class="visually-hidden">{copy.compose.lockedNote}</span></span>
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
          spellcheck="false"
          oninput={(e) => onInput(e, token.id)}
        />
        {#if errors[token.id]}<p class="error" id="err-{token.id}">{copy.compose.wordErrors[errors[token.id]]}</p>{/if}
        <div class="actions">
          {#if canSplit(phrase, token.id)}
            <button class="small" aria-label="{copy.compose.split}: {token.text}" onclick={() => (phrase = split(phrase, token.id))}>
              {copy.compose.split}
            </button>
          {:else if canCombine(phrase, token.id)}
            <button class="small" aria-label="{copy.compose.join}: {token.text}" onclick={() => (phrase = combine(phrase, token.id))}>
              {copy.compose.join}
            </button>
          {/if}
        </div>
      {:else}
        <span class="connector-text">{token.text}</span>
        <div class="actions">
          <button class="small" aria-label={copy.compose.remove(token.text)} onclick={() => (phrase = removeConnector(phrase, token.id))}>
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
</ol>
<p class="visually-hidden" aria-live="polite">{announcement}</p>

<section class="preview" aria-labelledby="preview-title">
  <h2 id="preview-title">{copy.compose.previewLabel}</h2>
  <p class="phrase" data-testid="phrase-preview">{text}</p>
  <p class="counts">{copy.compose.counts(intact, phrase.slots.length, connectorCount, [...text].length)}</p>
  <p class="guidance">{guidance}</p>
  {#if intact < phrase.slots.length}<p class="note">{copy.compose.editedNote}</p>{/if}
  {#if /[^\x20-\x7e]/.test(text)}<p class="note warn">{copy.compose.keyboardNote}</p>{/if}
</section>

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


<div class="footer">
  <button class="button secondary" onclick={onback}>
    <Icon name="back" />
    {copy.compose.back}
  </button>
  <button class="button secondary" onclick={resetChanges} disabled={!hasEdits(phrase)}>{copy.compose.reset}</button>
  <button class="button secondary" onclick={() => (freshOpen = true)} disabled={!status.canGenerate}>{copy.compose.startFresh}</button>
  <p>{copy.compose.nextStep}</p>
</div>

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
  .token.origin-edited,
  .token.origin-rewritten {
    background: var(--paper);
  }
  .token.selected {
    border: 2px solid var(--navy-900);
  }
  .token.dragging {
    opacity: 0.45;
  }
  .token.drop-before {
    box-shadow: -6px 0 0 -2px var(--yellow-deep);
  }
  .tokens.drop-end {
    box-shadow: inset -4px 0 0 var(--yellow-deep);
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
  .locked {
    display: flex;
    margin-left: auto;
    color: var(--navy-900);
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
    background: rgb(255 194 26 / 0.18);
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
  .tray p {
    margin: 0.4rem 0 0;
    font-size: 0.88rem;
    color: var(--ink-soft);
  }

  .separators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 1rem 0 0;
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
    margin-top: 0.9rem;
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
  .footer p {
    flex-basis: 100%;
    margin: 0;
    color: var(--ink-soft);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 600px) {
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
