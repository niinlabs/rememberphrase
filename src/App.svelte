<script lang="ts">
  import { tick } from 'svelte';
  import { copy } from './copy';
  import logo from './assets/logo-on-dark.webp';
  import { languages } from './wordlists';
  import { loadWordlist, WordlistError } from './core/wordlist';
  import { checkReachability, type ProbeResult } from './core/reachability';
  import { canRunLocalCheck, connectionStatus, type Readiness } from './core/status';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import ConnectionAlert from './components/ConnectionAlert.svelte';
  import Generate from './components/Generate.svelte';
  import Compose from './components/Compose.svelte';
  import Remember from './components/Remember.svelte';
  import Landing from './components/Landing.svelte';
  import { drawFrom, type Phrase } from './core/phrase';
  import { NO_RULES, type Rules } from './core/policy';
  import Icon from './components/Icon.svelte';
  import StatusBand from './components/StatusBand.svelte';

  let languageCode = $state(languages[0].code);
  let words = $state<string[] | null>(null);
  let loading = $state(false);
  let listError = $state<WordlistError['reason'] | null>(null);
  let osConfirmed = $state(false);
  let probe = $state<ProbeResult | 'pending' | null>(null);
  let skipper: AbortController | null = null;
  let localCheckOk = $state(false);
  let localCheckFailed = $state(false);
  let browserOnline = $state(navigator.onLine);
  let reconnected = $state(false);
  let alertOpen = $state(false);
  let step = $state<'landing' | 'prepare' | 'generate' | 'compose' | 'remember'>('landing');
  // The phrase lives here so moving between steps never loses it (volatile tab state only).
  let phrase = $state<Phrase | null>(null);
  let rules = $state<Rules>(NO_RULES); // login requirements the user stated (D9), volatile like the phrase
  let confirmBox = $state<HTMLInputElement>();

  const language = $derived(languages.find((l) => l.code === languageCode)!);
  const readiness: Readiness = $derived({
    listReady: words !== null,
    rngAvailable: typeof globalThis.crypto?.getRandomValues === 'function',
    osConfirmed,
    probe: probe === 'pending' ? null : probe,
    localCheckOk,
    localCheckFailed,
    browserOnline,
    reconnected,
  });
  const status = $derived(connectionStatus(readiness));
  const stage = $derived(words === null ? 'fetch' : status.canGenerate ? 'ready' : 'offline');
  const stageIndex = $derived(stage === 'fetch' ? 0 : stage === 'offline' ? 1 : 2);
  const order = ['fetch', 'offline'] as const;
  const chip = $derived(
    status.colour === 'red'
      ? copy.chip.red
      : status.colour === 'green'
        ? copy.chip.green
        : status.canGenerate
          ? copy.chip[status.reason]
          : copy.chip.notReady,
  );
  const stepIndex = $derived({ landing: -1, prepare: 0, generate: 1, compose: 2, remember: 3 }[step]); // the introduction is unnumbered
  const panel = $derived(step === 'prepare' ? copy.panel[stage] : copy.panel[step]);
  const alertText = $derived(status.colour === 'red' ? copy.band[status.reason] : '');
  const count = (n: number) => new Intl.NumberFormat('en').format(n);

  async function fetchWords() {
    loading = true;
    listError = null;
    try {
      words = await loadWordlist(language.list);
    } catch (e) {
      listError = e instanceof WordlistError ? e.reason : 'download';
    } finally {
      loading = false;
    }
  }

  async function confirmOffline() {
    reconnected = false;
    localCheckOk = false;
    localCheckFailed = false;
    alertOpen = false;
    skipper = new AbortController();
    probe = 'pending';
    probe = await checkReachability(skipper.signal);
    if (probe === 'site-answered' || probe === 'network-answered') alertOpen = true;
    else if (canRunLocalCheck(readiness)) localCheck();
    await advanceWhenReady();
  }

  // Once preparation settles in an allowed state, move on to Generate. Nothing is drawn: the user
  // still asks for words there. Coming back to Prepare later does not bounce forward again.
  async function advanceWhenReady() {
    if (step === 'prepare' && status.canGenerate) await goTo('generate');
  }

  // A silent draw shows this tab can make words from the loaded list; the words are discarded unseen.
  // A failed draw holds preparation but stays retryable, from its own button or by confirming again.
  function localCheck() {
    try {
      const draw = drawFrom(words!); // the same path real draws take
      for (let i = 0; i < 6; i++) draw();
      localCheckOk = true;
      localCheckFailed = false;
    } catch {
      localCheckOk = false;
      localCheckFailed = true;
    }
  }

  function retryLocalCheck() {
    if (canRunLocalCheck(readiness)) localCheck();
    advanceWhenReady();
  }

  // A real draw that throws means the random source cannot be trusted right now: hold every
  // further draw (D7 row 3) until a retried check succeeds. The phrase on screen is untouched.
  function drawFailed() {
    localCheckOk = false;
    localCheckFailed = true;
  }

  function online() {
    browserOnline = true;
    if (probe === null) return;
    // Confirmation starts when the check starts, so a reconnection during the check also holds (D7 row 2).
    reconnected = true;
    localCheckOk = false;
    skipper?.abort();
    alertOpen = true;
  }

  // The explanation closes; the red hold stays until the user confirms again and a new check runs,
  // so acknowledging always returns to Go offline, even from a later step.
  async function acknowledge() {
    alertOpen = false;
    osConfirmed = false;
    step = 'prepare';
    await tick();
    confirmBox?.focus();
  }

  async function goTo(next: typeof step) {
    step = next;
    await tick();
    document.getElementById('page-title')?.focus();
  }

  // Nothing is stored, so leaving the page loses the prepared tab; ask first once the list is loaded.
  function beforeUnload(e: BeforeUnloadEvent) {
    if (words) e.preventDefault();
  }
</script>

<svelte:window ononline={online} onoffline={() => (browserOnline = false)} onbeforeunload={beforeUnload} />

<div class="canvas">
  <header class="masthead">
    <div class="brand">
      <p class="wordmark"><img src={logo} alt="Rememberphrase" width="640" height="96" /></p>
      <p class="tagline">{copy.tagline}</p>
    </div>
    <!-- Nothing about the connection is known or relevant until Step 1 starts. -->
    {#if step !== 'landing'}
      <p class="chip {status.colour}" data-testid="status-chip">
        <Icon name={status.colour === 'red' ? 'hold' : status.colour === 'green' ? 'ready' : 'pending'} size={20} />
        {chip}
      </p>
    {/if}
  </header>

  <nav class="stepper" aria-label="Progress">
    <ol>
      {#each copy.steps as step, i (step.name)}
        <li class:current={i === stepIndex} class:done={i < stepIndex} aria-current={i === stepIndex ? 'step' : undefined}>
          <span class="dot">{#if i < stepIndex}<Icon name="check" size={20} />{:else}{i + 1}{/if}</span>
          <span class="step-text"><strong>{step.name}</strong><span>{step.hint}</span></span>
        </li>
      {/each}
    </ol>
  </nav>

  <main class="card">
    <section class="work" aria-labelledby="page-title">
      {#if step === 'landing'}
        <Landing onstart={() => goTo('prepare')} />
      {:else if step === 'generate' && words}
        <Generate
          {words}
          {status}
          bind:phrase
          onback={() => goTo('prepare')}
          oncontinue={() => goTo('compose')}
          ondrawfailed={drawFailed}
          onretry={retryLocalCheck}
        />
      {:else if step === 'compose' && words && phrase}
        <Compose
          {words}
          {status}
          bind:phrase
          bind:rules
          onback={() => goTo('generate')}
          oncontinue={() => goTo('remember')}
          ondrawfailed={() => {
            drawFailed();
            goTo('generate');
          }}
        />
      {:else if step === 'remember' && words}
        <Remember
          {phrase}
          listSize={words.length}
          {rules}
          onback={() => goTo('compose')}
          onclear={() => {
            phrase = null;
            rules = NO_RULES;
          }}
          onanother={() => goTo('generate')}
        />
      {:else}
      <h1 id="page-title" tabindex="-1">{copy.heading}</h1>
      <p class="intro">{copy.intro}</p>

      <ol class="stages">
        {#each order as key, i (key)}
          {@const pos = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'upcoming'}
          <li class="stage {pos}" aria-current={pos === 'current' ? 'step' : undefined}>
            <span class="marker" aria-hidden="true">
              {#if pos === 'done'}<Icon name="check" size={18} />{:else}{i + 1}{/if}
            </span>
            <div class="stage-body">
              <h2>{copy.stages[key]}</h2>

              {#if key === 'fetch'}
                {#if words}
                  <p class="summary">{copy.list.ready(language.name, count(words.length))}</p>
                {:else if pos === 'current'}
                  <p class="meta">{copy.list.helper}</p>
                  <div class="fetch-row">
                    <label class="field">
                      <span>{copy.list.languageLabel}</span>
                      <select bind:value={languageCode} disabled={loading}>
                        {#each languages as l (l.code)}<option value={l.code}>{l.name}</option>{/each}
                      </select>
                    </label>
                    <button class="button primary" onclick={fetchWords} disabled={loading}>
                      {loading ? copy.list.loading : listError ? copy.list.retry : copy.list.action}
                    </button>
                  </div>
                  {#if listError}<p class="error" role="alert">{copy.list.errors[listError]}</p>{/if}
                {/if}
              {:else if pos === 'current'}
                <p class="meta">{copy.offline.lead}</p>
                <ul class="platforms">
                  {#each copy.offline.platforms as p (p.name)}<li><strong>{p.name}:</strong> {p.how}</li>{/each}
                </ul>
                <p class="meta">{copy.offline.check}</p>
                <StatusBand {status} />
                {#if status.colour === 'amber' && !status.canGenerate && status.reason === 'local-check-failed'}
                  <button class="button primary" onclick={retryLocalCheck}>{copy.offline.retryCheck}</button>
                {/if}
                <div class="confirm-row">
                  <label class="confirm">
                    <input type="checkbox" bind:checked={osConfirmed} bind:this={confirmBox} />
                    <span>{copy.offline.confirmLabel}</span>
                  </label>
                  <!-- Without a random source nothing can become ready, so confirming would be a dead end. -->
                  <button
                    class="button primary"
                    onclick={confirmOffline}
                    disabled={!osConfirmed || probe === 'pending' || !readiness.rngAvailable}
                  >
                    <Icon name="offline" />
                    {copy.offline.confirm}
                  </button>
                </div>
              {:else if pos === 'done'}
                <p class="summary">{probe === 'skipped' ? copy.offline.skipped : copy.offline.noAnswer}</p>
              {/if}
            </div>
          </li>
        {/each}
      </ol>

      <!-- Only reached by going back from Generate; the first time, preparation moves on by itself. -->
      {#if stage === 'ready'}
        <button class="button primary continue" onclick={() => goTo('generate')}>
          {copy.ready.continue}
          <Icon name="forward" />
        </button>
      {/if}
      {/if}
    </section>

    <aside class="panel" aria-labelledby="panel-title">
      <h2 id="panel-title">{panel.title}</h2>
      {#each panel.body as line (line)}<p>{line}</p>{/each}
      <hr />
      <p class="small">{copy.panel.noStorage}</p>
      <p class="small">{copy.panel.attribution}</p>
    </aside>
  </main>
</div>

<ConfirmDialog open={probe === 'pending'} onskip={() => skipper?.abort()} />
<ConnectionAlert open={alertOpen} reason={alertText} onacknowledge={acknowledge} />

<style>
  /* Navy throughout, with a faint warmth of the logo's yellow at the top right and lower left. */
  .canvas {
    min-height: 100vh;
    padding: 1.25rem clamp(1rem, 4vw, 3rem) 2.5rem;
    background:
      radial-gradient(56rem 34rem at 100% 0%, color-mix(in srgb, var(--yellow) 30%, transparent), transparent 70%),
      radial-gradient(48rem 32rem at 0% 100%, color-mix(in srgb, var(--yellow) 16%, transparent), transparent 70%),
      linear-gradient(165deg, var(--navy-900), var(--navy-950) 60%);
  }

  .masthead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    max-width: 78rem;
    margin: 0 auto;
    color: #fff;
  }
  .masthead :global(:focus-visible) {
    outline-color: var(--yellow);
  }
  .wordmark {
    margin: 0;
  }
  .wordmark img {
    display: block;
    width: auto;
    height: clamp(2rem, 3.4vw, 2.75rem);
  }
  .tagline {
    margin: 0.35rem 0 0;
    font-size: 1rem;
    color: #dfe5f2;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    padding: 0.5rem 0.85rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    background: var(--paper);
  }
  .chip.red {
    color: var(--red);
  }
  .chip.amber {
    color: var(--amber);
  }
  .chip.green {
    color: var(--green);
  }

  .stepper {
    max-width: 78rem;
    margin: 1rem auto 1.1rem;
  }
  .stepper ol {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stepper li {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: #b8c2d9;
  }
  .dot {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    background: var(--navy-700);
    color: #e7ecf6;
    font-weight: 800;
    font-size: 1.15rem;
  }
  .stepper li.current {
    color: #fff;
  }
  .stepper li.done {
    color: #fff;
  }
  .stepper li.done .dot {
    background: var(--yellow);
    color: var(--navy-950);
  }
  .stepper li.current .dot {
    background: var(--yellow);
    color: var(--navy-950);
    box-shadow: 0 0 0 4px rgb(254 212 0 / 0.28);
  }
  .step-text {
    display: grid;
    line-height: 1.25;
  }
  .step-text span {
    font-size: 0.9rem;
  }

  .card {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(17rem, 1fr);
    gap: clamp(1.25rem, 3vw, 2.25rem);
    max-width: 78rem;
    margin: 0 auto;
    padding: clamp(1.25rem, 2.5vw, 1.75rem);
    border-radius: var(--radius-card);
    background: var(--paper);
    box-shadow: var(--shadow-card);
  }
  h1:focus {
    outline: none;
  }
  h1 {
    margin: 0;
    font-size: clamp(1.75rem, 3.2vw, 2.4rem);
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-wrap: balance;
  }
  .intro {
    margin: 0.4rem 0 1rem;
    font-size: 1.1rem;
    color: var(--ink-soft);
  }

  .stages {
    display: grid;
    gap: 0.25rem;
    margin: 0.9rem 0 0;
    padding: 0;
    list-style: none;
  }
  .stage {
    display: grid;
    grid-template-columns: 2.25rem minmax(0, 1fr);
    gap: 0.9rem;
    padding: 0.55rem 0;
  }
  .stage + .stage {
    border-top: 1px solid var(--line);
  }
  .marker {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: 2px solid var(--line);
    color: var(--muted);
    font-weight: 800;
  }
  .stage.current .marker {
    border-color: var(--yellow);
    background: var(--yellow);
    color: var(--navy-950);
  }
  .stage.done .marker {
    border-color: var(--navy-900);
    background: var(--navy-900);
    color: var(--yellow);
  }
  .stage h2 {
    margin: 0.3rem 0 0;
    font-size: 1.2rem;
    letter-spacing: -0.01em;
  }
  .stage.upcoming h2 {
    color: #5d6782;
  }
  .stage-body {
    display: grid;
    gap: 0.7rem;
    justify-items: start;
  }
  .stage.done .stage-body {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.9rem;
  }
  .confirm-row,
  .fetch-row {
    justify-self: stretch;
  }
  .confirm-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .confirm-row .confirm {
    flex: 1 1 20rem;
  }
  .meta,
  .summary,
  .error,
  .platforms {
    margin: 0;
  }
  .meta,
  .summary {
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .summary {
    font-weight: 600;
  }
  .error {
    color: var(--red);
    font-weight: 650;
  }
  .platforms {
    display: grid;
    gap: 0.3rem;
    padding-left: 1.2rem;
    line-height: 1.45;
  }
  .confirm {
    display: flex;
    gap: 0.7rem;
    align-items: flex-start;
    padding: 0.8rem 1rem;
    border-radius: var(--radius);
    background: var(--cream);
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
  }
  .confirm input {
    flex: none;
    width: 1.3rem;
    height: 1.3rem;
    margin: 0.05rem 0 0;
    accent-color: var(--navy-900);
  }

  .fetch-row {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.75rem;
  }
  .field {
    display: grid;
    gap: 0.3rem;
    font-weight: 650;
  }
  .field select {
    min-height: 3.25rem;
    min-width: 11rem;
    padding: 0.6rem 0.8rem;
    border: 2px solid var(--cream-line);
    border-radius: var(--radius);
    background: var(--paper);
    font-weight: 650;
  }
  .continue {
    margin-top: 1rem;
  }
  .panel {
    align-self: start;
    padding: 1.4rem 1.5rem;
    border-radius: 20px;
    background: var(--cream);
    line-height: 1.55;
  }
  .panel h2 {
    margin: 0 0 0.6rem;
    font-size: 1.3rem;
    letter-spacing: -0.01em;
  }
  .panel p {
    margin: 0 0 0.75rem;
    color: var(--ink-soft);
  }
  .panel hr {
    margin: 1rem 0;
    border: none;
    border-top: 1px solid var(--cream-line);
  }
  .panel .small {
    font-size: 0.92rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 960px) {
    .card {
      grid-template-columns: minmax(0, 1fr);
    }
    .stepper ol {
      gap: 0.4rem;
    }
    .step-text span {
      display: none;
    }
  }
  @media (max-width: 600px) {
    .tagline {
      font-size: 0.9rem;
    }
    .stepper li {
      flex-direction: column;
      gap: 0.3rem;
      text-align: center;
      font-size: 0.8rem;
    }
    .dot {
      width: 2rem;
      height: 2rem;
      font-size: 0.95rem;
    }
    .button {
      width: 100%;
    }
  }
</style>
