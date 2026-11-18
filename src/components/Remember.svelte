<script lang="ts">
  import { tick } from 'svelte';
  import { copy, guidanceFor } from '../copy';
  import { intactRandomWords, phraseText, SEPARATORS, storyTexts, type Phrase } from '../core/phrase';
  import { checkRules, type Rules } from '../core/policy';
  import Icon from './Icon.svelte';
  import WarnDialog from './WarnDialog.svelte';

  let {
    phrase,
    rules,
    onback,
    onclear,
    onanother,
  }: {
    phrase: Phrase | null;
    rules: Rules;
    onback: () => void;
    onclear: () => void;
    onanother: () => void;
  } = $props();

  type Aid = 'follow' | 'reveal' | 'none';

  // All practice state is local, so leaving this step (to edit the phrase, or on a reconnection)
  // destroys it: an attempt never outlives the phrase it was typed for (D13).
  let aid = $state<Aid>('none'); // D13: no aid by default, so nothing of the phrase shows unasked
  let withConnectors = $state(false); // adds the connecting words to Follow along or Reveal as you type
  let whole = $state(false); // the Reveal whole phrase escape hatch, separate from the aids
  let attempt = $state('');
  let masked = $state(true);
  let clearOpen = $state(false);
  let entry = $state<HTMLInputElement>();

  const text = $derived(phrase ? phraseText(phrase) : '');
  const intact = $derived(phrase ? intactRandomWords(phrase) : 0);
  const hasAdded = $derived(!!phrase?.tokens.some((t) => t.kind !== 'word'));
  const unmet = $derived(checkRules(text, rules).filter((c) => !c.met).length);
  const aids = ['follow', 'reveal', 'none'] as const;

  // How much of the phrase is typed correctly so far. Progress stops at the first mistake, so an aid
  // never lights the answer past it.
  const chars = $derived([...text]);
  const lit = $derived.by(() => {
    const typed = [...attempt];
    let n = 0;
    while (n < typed.length && n < chars.length && typed[n] === chars[n]) n++;
    return n;
  });
  const mistake = $derived([...attempt].length > lit);

  // The phrase in token order: what is typed, with the separators between it, and added words that are
  // not typed, which go after the separator they sit in. Words cased as typed.
  const hintParts = $derived.by(() => {
    const p = phrase;
    if (!p) return [];
    const story = storyTexts(p);
    const typed = (i: number) => p.typeAdded || p.tokens[i].kind === 'word';
    let typedBefore = false;
    let sepDone = false;
    return p.tokens.map((t, i) => {
      let sep = '';
      if (typedBefore && !sepDone && p.tokens.some((_, j) => j >= i && typed(j))) {
        sep = SEPARATORS[p.separator];
        sepDone = true;
      }
      if (typed(i)) [typedBefore, sepDone] = [true, false];
      return { id: t.id, sep, masked: t.kind === 'word', typed: typed(i), text: story[i] };
    });
  });

  // The rail as runs: lit (typed correctly), dim (shown), masked (dots), aside (not typed) and the stop
  // mark after the last correct character. Typed runs together spell exactly the phrase text, so they
  // line up with lit. Reveal as you type masks everything not yet lit, except, with connecting words
  // shown, all that is not a random word; asides show only with connecting words.
  type Run = { kind: 'lit' | 'dim' | 'masked' | 'aside' | 'stop'; text: string };
  const runs = $derived.by(() => {
    const out: Run[] = [];
    const show = withConnectors && hasAdded;
    const push = (kind: Run['kind'], text: string) => {
      const last = out.at(-1);
      if (last?.kind === kind && kind !== 'aside') last.text += text;
      else out.push({ kind, text });
    };
    let k = 0;
    const typed = (s: string, random: boolean) => {
      for (const c of s) {
        push(k < lit ? 'lit' : aid === 'follow' || (show && !random) ? 'dim' : 'masked', c);
        if (++k === lit && mistake) push('stop', '');
      }
    };
    if (lit === 0 && mistake) push('stop', '');
    for (const part of hintParts) {
      typed(part.sep, false);
      if (part.typed) typed(part.text, part.masked);
      else if (show) push('aside', part.text);
    }
    typed(`${phrase?.decoration.digit ?? ''}${phrase?.decoration.symbol ?? ''}`, false);
    return out;
  });

  // Exact comparison with the string the preview showed, so case, separators and symbols all count.
  // Every aid says as you type whether the attempt is on track, too long, wrong or a match.
  const live = $derived.by(() => {
    if (!attempt) return null;
    if (attempt === text) return 'match';
    if (text.startsWith(attempt)) return 'short';
    return attempt.startsWith(text) ? 'long' : 'wrong';
  });
  const matched = $derived(live === 'match');
  const messages = {
    match: copy.remember.match,
    wrong: copy.remember.live.wrong,
    short: copy.remember.live.short,
    long: copy.remember.live.long,
  };

  function forget() {
    attempt = '';
  }

  function nextAttempt() {
    forget();
    entry?.focus();
  }

  async function clear() {
    clearOpen = false;
    forget();
    whole = false;
    onclear();
    await tick();
    document.getElementById('page-title')?.focus();
  }
</script>

<h1 id="page-title" tabindex="-1">{copy.remember.heading}</h1>

{#if !phrase}
  <p class="intro" role="status">{copy.remember.cleared}</p>
  <h2>{copy.remember.clearedTipsTitle}</h2>
  <ul class="tips">
    {#each copy.remember.clearedTips as tip (tip)}<li>{tip}</li>{/each}
  </ul>
  <div class="footer">
    <button class="button primary" onclick={onanother}>{copy.remember.another}</button>
  </div>
{:else}
  <p class="intro">{copy.remember.intro}</p>
  <!-- D4: a short phrase keeps its caution at the top, where it cannot be missed. -->
  {#if intact <= 5}
    <p class="caution" data-testid="caution"><Icon name="caution" size={20} />{guidanceFor(intact)}</p>
  {/if}

  {#if unmet}
    <p class="unmet">
      {copy.remember.rulesUnmet(unmet)}
      <button class="link" onclick={onback}>{copy.remember.fixRules}</button>
    </p>
  {/if}

  <section class="stick" aria-labelledby="tips-title">
    <h2 id="tips-title">{copy.remember.tipsTitle}</h2>
    <p>{copy.remember.stick}</p>
    <details class="ideas">
      <summary>{copy.remember.ideasTitle}</summary>
      <ul class="tips">
        {#each copy.remember.tips as tip (tip)}<li>{tip}</li>{/each}
      </ul>
    </details>
  </section>

  <section class="practice" aria-labelledby="practice-title">
    <h2 id="practice-title">{copy.remember.practiceTitle}</h2>
    <p class="help">{copy.remember.practiceIntro}</p>

    <fieldset class="aids" aria-describedby="aid-help">
      <legend>{copy.remember.aidLegend}</legend>
      <div class="segments">
        {#each aids as a (a)}
          <label class:on={aid === a}><input type="radio" name="aid" value={a} bind:group={aid} />{copy.remember.aids[a]}</label>
        {/each}
      </div>
      <p class="help" id="aid-help">{copy.remember.aidHelp[aid]}</p>
      {#if hasAdded}
        <!-- Kept but greyed out with No aid, which shows nothing to add the words to. -->
        <label class="with-connectors">
          <input type="checkbox" bind:checked={withConnectors} disabled={aid === 'none'} />
          {copy.remember.showConnectors}
        </label>
      {/if}
    </fieldset>

    <!-- The rail shows what the chosen aid allows of the phrase; with No aid there is none. Its content
         is written on one line, as Svelte drops whitespace between elements and the rail keeps spaces. -->
    {#if aid !== 'none'}
      <p class="rail" data-testid="practice-rail">
        {#each runs as run, i (i)}{#if run.kind === 'stop'}<span class="stop" aria-hidden="true"></span>{:else if run.kind === 'masked'}<span class="dim" aria-hidden="true">{'•'.repeat([...run.text].length)}</span><span class="visually-hidden">{copy.remember.hidden([...run.text].length)}</span>{:else if run.kind === 'aside'}<span class="aside"><span class="visually-hidden">{`${copy.remember.notTyped} `}</span>{run.text}</span>{:else}<span class={run.kind}>{run.text}</span>{/if}{/each}
      </p>
    {/if}

    <label class="field" for="attempt">{copy.remember.attemptLabel}</label>
    <div class="entry">
      <!-- No form, so nothing can be submitted. The ignore attributes ask password managers not to offer saving. -->
      <input
        id="attempt"
        bind:this={entry}
        type={masked ? 'password' : 'text'}
        value={attempt}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        data-1p-ignore
        data-lpignore="true"
        oninput={(e) => (attempt = e.currentTarget.value)}
        onkeydown={(e) => {
          if (e.key === 'Enter' && matched) nextAttempt();
        }}
      />
      {#if attempt}
        <button class="eye" aria-label={copy.remember.clearEntry} onmousedown={(e) => e.preventDefault()} onclick={nextAttempt}>
          <Icon name="close" />
        </button>
      {/if}
      <!-- The eye changes how the typing shows, not which aid is active. Pressing it keeps focus (and the
           phone keyboard) in the field. -->
      <button
        class="eye"
        aria-label={masked ? copy.remember.showEntry : copy.remember.hideEntry}
        aria-controls="attempt"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => (masked = !masked)}
      >
        <Icon name={masked ? 'eye' : 'eye-off'} />
      </button>
    </div>

    <!-- Red and green (approved 2026-11-05 for practice), always with an icon so colour is not the only signal. -->
    <p class="result {live}" role="status" data-testid="practice-result">
      {#if live === 'match'}<Icon name="check" size={20} />{:else if live && live !== 'short'}<Icon name="close" size={20} />{/if}
      {live ? messages[live] : ''}
    </p>
    <div class="actions">
      {#if matched}<button class="button primary" onclick={nextAttempt}>{copy.remember.retry}</button>{/if}
      <button class="link whole" aria-expanded={whole} aria-controls="whole" onclick={() => (whole = !whole)}>
        {whole ? copy.remember.hidePhrase : copy.remember.showPhrase}
      </button>
    </div>
    <div id="whole">
      {#if whole}<p class="phrase" data-testid="reference-phrase">{text}</p>{/if}
    </div>
    <p class="help">{copy.remember.practiceLimits}</p>
  </section>

  <section class="recovery" aria-labelledby="recovery-title">
    <h2 id="recovery-title">{copy.remember.recoveryTitle}</h2>
    <ul class="tips">
      {#each copy.remember.recovery as line (line)}<li>{line}</li>{/each}
    </ul>
    <div class="clear-row">
      <button class="button primary" onclick={() => (clearOpen = true)}>{copy.remember.clear}</button>
      <p>{copy.remember.clearHelp}</p>
    </div>
  </section>

  <!-- D8 as amended 2026-11-18: one dot per random draw in the phrase, filled while it still counts.
       Secondary to practice; a short phrase's caution is already at the top. -->
  <!-- Optional reading: it never holds back practice, recovery or the caution above. -->
  <details class="more">
    <summary>{copy.remember.moreTitle}</summary>
    <h3>{copy.remember.managersTitle}</h3>
    {#each copy.remember.managers as line (line)}<p>{line}</p>{/each}
    <h3>{copy.remember.twoFactorTitle}</h3>
    {#each copy.remember.twoFactor as line (line)}<p>{line}</p>{/each}
  </details>

  <div class="footer">
    <button class="button secondary" onclick={onback}>
      <Icon name="back" />
      {copy.remember.back}
    </button>
  </div>

  <WarnDialog
    open={clearOpen}
    title={copy.warn.clearTitle}
    body={copy.warn.clearBody}
    confirmLabel={copy.warn.clearConfirm}
    onconfirm={clear}
    oncancel={() => (clearOpen = false)}
  />
{/if}

<style>
  h1 {
    margin: 0;
    font-size: clamp(1.75rem, 3.2vw, 2.4rem);
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-wrap: balance;
  }
  h1:focus,
  h2:focus {
    outline: none;
  }
  .intro {
    margin: 0.4rem 0 0.3rem;
    font-size: 1.1rem;
    color: var(--ink-soft);
  }
  .caution {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.6rem 0 0;
    padding: 0.6rem 0.9rem;
    border-left: 5px solid var(--navy-900);
    border-radius: 6px;
    background: var(--cream);
    font-weight: 750;
  }
  .caution :global(svg) {
    flex: none; /* keeps the caution mark full size when the text wraps */
  }
  .stick p {
    margin: 0;
  }
  .ideas {
    margin-top: 0.4rem;
  }
  .ideas summary {
    font-size: 1rem;
  }
  .ideas .tips {
    margin-top: 0.4rem;
  }
  .unmet {
    margin: 0.6rem 0 0;
    padding: 0.6rem 0.9rem;
    border-left: 5px solid var(--navy-900);
    border-radius: 6px;
    background: var(--cream);
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-weight: 750;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .more {
    margin-top: 1.2rem;
  }
  summary {
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
  }
  .more p {
    margin: 0.5rem 0 0;
  }
  .more h3 {
    margin: 0.9rem 0 0;
    font-size: 1rem;
  }
  h2 {
    margin: 1.4rem 0 0.4rem;
    font-size: 1.2rem;
  }
  .tips {
    margin: 0;
    padding-left: 1.2rem;
    line-height: 1.5;
  }
  .help {
    margin: 0.3rem 0 0;
    font-size: 0.95rem;
    color: var(--ink-soft);
  }

  /* The workspace: one card from choosing an aid to checking the attempt. */
  .practice {
    margin-top: 1.4rem;
    padding: 0.2rem clamp(1rem, 3vw, 1.6rem) 1.2rem;
    border: 1px solid var(--cream-line);
    border-radius: 20px;
    background: var(--cream);
    box-shadow: 0 10px 28px -22px rgb(3 8 24 / 0.55);
  }
  .practice h2 {
    margin-top: 1rem;
    font-size: 1.35rem;
  }
  .aids {
    margin: 0.9rem 0 0;
    padding: 0;
    border: none;
  }
  .aids legend {
    margin-bottom: 0.45rem;
    padding: 0;
    font-weight: 700;
  }
  .segments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .segments label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2.5rem;
    padding: 0.3rem 0.85rem;
    border: 1px solid var(--cream-line);
    border-radius: 999px;
    background: var(--paper);
    font-weight: 650;
    cursor: pointer;
  }
  .segments label.on {
    border-color: var(--navy-900);
    background: var(--navy-900);
    color: #fff;
  }
  @media (max-width: 600px) {
    .segments {
      flex-direction: column;
    }
  }
  .segments input {
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: var(--yellow);
  }
  .with-connectors {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.5rem;
    font-weight: 650;
    cursor: pointer;
  }
  .with-connectors:has(input:disabled) {
    color: var(--muted);
    cursor: default;
  }
  .with-connectors input {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    margin: 0;
    accent-color: var(--navy-900);
  }
  .rail {
    margin: 0.8rem 0 0;
    padding: 0.85rem 1rem;
    border-radius: var(--radius);
    background: var(--navy-900);
    color: #fff;
    font-size: clamp(1.2rem, 2.2vw, 1.5rem);
    font-weight: 750;
    letter-spacing: 0.02em;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .rail .lit {
    color: var(--yellow);
  }
  .rail .dim {
    color: rgb(255 255 255 / 0.4);
  }
  /* Where a mistake stopped progress: a mark, never the next character. */
  .rail .stop {
    display: inline-block;
    width: 3px;
    height: 1.1em;
    margin: 0 2px;
    border-radius: 2px;
    background: #ff7a6b;
    vertical-align: text-bottom;
  }
  .rail .aside {
    margin: 0 0.3em;
    font-weight: 450;
    font-style: italic;
    color: #b9c3da;
  }
  .whole {
    margin-left: auto;
    font-size: 0.95rem;
  }
  .clear-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.9rem;
    margin-top: 0.9rem;
  }
  .clear-row p {
    margin: 0;
    color: var(--ink-soft);
  }
  .phrase {
    margin: 0.6rem 0 0;
    padding: 0.8rem 1rem;
    border-radius: var(--radius);
    background: var(--navy-900);
    color: #fff;
    font-size: clamp(1.2rem, 2.2vw, 1.5rem);
    font-weight: 750;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .field {
    display: block;
    margin-top: 1rem;
    font-weight: 700;
  }
  .entry {
    display: flex;
    margin-top: 0.35rem;
    border: 2px solid var(--cream-line);
    border-radius: var(--radius);
    background: var(--paper);
  }
  .entry:focus-within {
    border-color: var(--navy-900);
  }
  .entry input {
    flex: 1;
    min-width: 0;
    min-height: 3rem;
    padding: 0 0.9rem;
    border: none;
    border-radius: var(--radius);
    background: none;
    font-size: 1.15rem;
  }
  .entry input:focus-visible {
    outline: none;
  }
  .eye {
    flex: none;
    width: 3rem;
    border: none;
    border-radius: var(--radius);
    background: none;
    color: var(--ink);
    cursor: pointer;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.8rem;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.6rem 0 0;
    min-height: 1.5em; /* reserved, so the page does not jump when the result appears */
    font-weight: 700;
  }
  .result.match {
    color: var(--green);
  }
  .result.wrong,
  .result.long {
    color: var(--red);
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
</style>
