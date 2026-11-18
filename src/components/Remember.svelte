<script lang="ts">
  import { tick } from 'svelte';
  import { copy, guidanceFor } from '../copy';
  import { drawsInPhrase, intactRandomWords, phraseText, storyTexts, type Phrase } from '../core/phrase';
  import { checkRules, type Rules } from '../core/policy';
  import Icon from './Icon.svelte';
  import WarnDialog from './WarnDialog.svelte';

  let {
    phrase,
    listSize,
    rules,
    onback,
    onclear,
    onanother,
  }: {
    phrase: Phrase | null;
    listSize: number;
    rules: Rules;
    onback: () => void;
    onclear: () => void;
    onanother: () => void;
  } = $props();

  // All practice state is local, so leaving this step (to edit the phrase, or on a reconnection)
  // destroys it: an attempt never outlives the phrase it was typed for (D13).
  let revealed = $state<'phrase' | 'hint' | null>(null); // the phrase, or its words masked between the connecting words
  let attempt = $state('');
  let masked = $state(true);
  let result = $state<'match' | 'mismatch' | null>(null);
  let autoCheck = $state(false);
  let clearOpen = $state(false);
  let entry = $state<HTMLInputElement>();

  const text = $derived(phrase ? phraseText(phrase) : '');
  const intact = $derived(phrase ? intactRandomWords(phrase) : 0);
  const drawn = $derived(phrase ? drawsInPhrase(phrase) : 0); // removed words no longer count as drawn
  const hasAdded = $derived(!!phrase?.tokens.some((t) => t.kind !== 'word'));
  // The hint's words cased as in the full story under the phrase in Make it yours.
  const story = $derived(phrase ? storyTexts(phrase) : []);
  const toggle = (which: 'phrase' | 'hint') => (revealed = revealed === which ? null : which);
  const unmet = $derived(checkRules(text, rules).filter((c) => !c.met).length);

  // Exact comparison with the string the preview showed, so case, separators and symbols all count.
  const check = () => (result = attempt === text ? 'match' : 'mismatch');
  // Check as I type: says whether what is typed so far still leads to the phrase, without showing it.
  const live = $derived.by(() => {
    if (!autoCheck || !attempt) return null;
    if (attempt === text) return 'match';
    if (text.startsWith(attempt)) return 'short';
    return attempt.startsWith(text) ? 'long' : 'wrong';
  });
  const shown = $derived(autoCheck ? live : result);
  const messages = {
    match: copy.remember.match,
    mismatch: copy.remember.mismatch,
    wrong: copy.remember.live.wrong,
    short: copy.remember.live.short,
    long: copy.remember.live.long,
  };

  function forget() {
    attempt = '';
    result = null;
  }

  function retry() {
    forget();
    entry?.focus();
  }

  async function clear() {
    clearOpen = false;
    forget();
    revealed = null;
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
  <!-- D8 as amended 2026-11-18: one dot per random draw in the phrase, filled while it still counts. -->
  <section class="strength" aria-labelledby="strength-title">
    <h2 id="strength-title">{copy.remember.strengthTitle}</h2>
    <p class="count">
      <span class="dots" aria-hidden="true">{#each { length: drawn }, i (i)}<span class="dot" class:on={i < intact}></span>{/each}</span>
      {copy.remember.strengthCount(intact, drawn)}
    </p>
    <!-- D4: shorter phrases get a caution mark so the warning cannot be missed. -->
    <p class="guidance" class:caution={intact <= 5}>
      {#if intact <= 5}<Icon name="caution" size={20} />{/if}
      {guidanceFor(intact)}
    </p>
    <p>{intact === 0 ? copy.remember.strengthNone : copy.remember.strengthWhy(listSize.toLocaleString('en'))}</p>
    <details class="counts">
      <summary>{copy.remember.countsTitle}</summary>
      <ul class="tips">
        {#each copy.remember.counts as line (line)}<li>{line}</li>{/each}
      </ul>
    </details>
  </section>

  {#if unmet}
    <p class="unmet">
      {copy.remember.rulesUnmet(unmet)}
      <button class="link" onclick={onback}>{copy.remember.fixRules}</button>
    </p>
  {/if}

  <section aria-labelledby="tips-title">
    <h2 id="tips-title">{copy.remember.tipsTitle}</h2>
    <ul class="tips">
      {#each copy.remember.tips as tip (tip)}<li>{tip}</li>{/each}
    </ul>
  </section>

  <section class="practice" aria-labelledby="practice-title">
    <h2 id="practice-title">{copy.remember.practiceTitle}</h2>
    <p class="help">{copy.remember.practiceIntro}</p>

    <!-- The reference is hidden while recalling and is only shown on request, never announced by itself. -->
    <div class="reveals">
      <button class="button secondary reveal" aria-expanded={revealed === 'phrase'} aria-controls="reference" onclick={() => toggle('phrase')}>
        {revealed === 'phrase' ? copy.remember.hidePhrase : copy.remember.showPhrase}
      </button>
      {#if hasAdded}
        <button class="button secondary reveal" aria-expanded={revealed === 'hint'} aria-controls="reference" onclick={() => toggle('hint')}>
          {revealed === 'hint' ? copy.remember.hideHint : copy.remember.showHint}
        </button>
      {/if}
    </div>
    <div id="reference">
      {#if revealed === 'phrase'}<p class="phrase" data-testid="reference-phrase">{text}</p>{/if}
      <!-- The connecting and own words in clear, each random word as one star per character. -->
      {#if revealed === 'hint'}
        <p class="phrase" data-testid="reference-hint">
          {#each phrase.tokens as token, i (token.id)}{i > 0 ? ' ' : ''}{#if token.kind === 'word'}<span aria-hidden="true"
                >{'*'.repeat([...token.text].length)}</span
              ><span class="visually-hidden">{copy.remember.hiddenWord([...token.text].length)}</span>{:else}{story[i]}{/if}{/each}
        </p>
      {/if}
    </div>

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
        oninput={(e) => {
          attempt = e.currentTarget.value;
          result = null;
        }}
        onkeydown={(e) => {
          if (e.key === 'Enter' && attempt && !autoCheck) check();
        }}
      />
      {#if attempt}
        <button class="eye" aria-label={copy.remember.clearEntry} onmousedown={(e) => e.preventDefault()} onclick={retry}>
          <Icon name="close" />
        </button>
      {/if}
      <!-- Pressing the eye keeps focus (and the phone keyboard) in the field. -->
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

    <label class="auto">
      <input type="checkbox" bind:checked={autoCheck} onchange={() => (result = null)} />
      {copy.remember.autoCheck}
    </label>

    <div class="actions">
      <button class="button primary" onclick={check} disabled={!attempt || autoCheck}>{copy.remember.check}</button>
      {#if result === 'mismatch'}<button class="button secondary" onclick={retry}>{copy.remember.retry}</button>{/if}
    </div>
    <!-- Red and green (approved 2026-11-05 for practice), always with an icon so colour is not the only signal. -->
    <p class="result {shown}" role="status" data-testid="practice-result">
      {#if shown === 'match'}<Icon name="check" size={20} />{:else if shown && shown !== 'short'}<Icon name="close" size={20} />{/if}
      {shown ? messages[shown] : ''}
    </p>
    <p class="help">{copy.remember.practiceLimits}</p>
  </section>

  <section class="recovery" aria-labelledby="recovery-title">
    <h2 id="recovery-title">{copy.remember.recoveryTitle}</h2>
    <ul class="tips">
      {#each copy.remember.recovery as line (line)}<li>{line}</li>{/each}
    </ul>
  </section>

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
    <button class="button primary" onclick={() => (clearOpen = true)}>{copy.remember.clear}</button>
    <p>{copy.remember.clearHelp}</p>
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
  .guidance {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-weight: 650;
  }
  .guidance :global(svg) {
    flex: none; /* keeps the caution mark full size when the text wraps */
  }
  .guidance.caution {
    margin-top: 0.4rem;
    padding: 0.6rem 0.9rem;
    border-left: 5px solid var(--navy-900);
    border-radius: 6px;
    background: var(--cream);
    font-weight: 750;
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
  .strength p,
  .more p {
    margin: 0.5rem 0 0;
  }
  .more h3 {
    margin: 0.9rem 0 0;
    font-size: 1rem;
  }
  .strength .tips {
    margin-top: 0.5rem;
  }
  .count {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.7rem;
    font-weight: 750;
  }
  .dots {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  /* Navy and yellow only: red, amber and green belong to the connection band. */
  .dot {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--navy-900);
    border-radius: 50%;
  }
  .dot.on {
    background: var(--yellow);
  }
  .counts {
    margin-top: 0.6rem;
  }
  .counts summary {
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

  .practice {
    margin-top: 1.2rem;
    padding: 0.2rem 1.1rem 1rem;
    border: 1px solid var(--cream-line);
    border-radius: 18px;
    background: var(--cream);
  }
  .practice h2 {
    margin-top: 0.9rem;
  }
  .reveals {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.8rem;
  }
  .reveal {
    min-height: 2.75rem;
    font-size: 1rem;
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
  .auto {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.7rem;
    cursor: pointer;
  }
  .auto input {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--navy-900);
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
  .result.mismatch,
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
  .footer p {
    flex-basis: 100%;
    margin: 0;
    color: var(--ink-soft);
  }
</style>
