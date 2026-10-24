<script lang="ts">
  import { copy } from './copy';
  import { languages } from './wordlists';
  import { loadWordlist, WordlistError } from './core/wordlist';
  import { checkReachability, type ProbeResult } from './core/reachability';
  import { sampleWords } from './core/random';
  import { canRunSample, connectionStatus, type Readiness } from './core/status';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import Icon from './components/Icon.svelte';
  import StatusBand from './components/StatusBand.svelte';

  let languageCode = $state(languages[0].code);
  let words = $state<string[] | null>(null);
  let loading = $state(false);
  let listError = $state<WordlistError['reason'] | null>(null);
  let osConfirmed = $state(false);
  let probe = $state<ProbeResult | 'pending' | null>(null);
  let skipper: AbortController | null = null;
  let sampleOk = $state(false);
  let browserOnline = $state(navigator.onLine);
  let reconnected = $state(false);
  let samples = $state<string[][]>([]);
  let rngError = $state(false);

  const language = $derived(languages.find((l) => l.code === languageCode)!);
  const readiness: Readiness = $derived({
    listReady: words !== null,
    rngAvailable: typeof globalThis.crypto?.getRandomValues === 'function',
    osConfirmed,
    probe: probe === 'pending' ? null : probe,
    sampleOk,
    browserOnline,
    reconnected,
  });
  const status = $derived(connectionStatus(readiness));
  const stage = $derived(
    words === null ? 'language' : probe === null || probe === 'pending' || status.colour === 'red' ? 'offline' : 'sample',
  );
  const order = ['language', 'offline', 'sample'] as const;
  const chip = $derived(
    status.colour === 'red'
      ? copy.chip.red
      : status.colour === 'green'
        ? copy.chip.green
        : status.canGenerate
          ? copy.chip[status.reason]
          : copy.chip.notReady,
  );
  const count = (n: number) => new Intl.NumberFormat('en').format(n);

  async function prepare() {
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
    skipper = new AbortController();
    probe = 'pending';
    probe = await checkReachability(skipper.signal);
  }

  function sample() {
    rngError = false;
    try {
      samples.unshift(sampleWords(words!, 6));
      sampleOk = true;
    } catch {
      rngError = true;
    }
  }

  function online() {
    browserOnline = true;
    if (probe !== null && probe !== 'pending') reconnected = true;
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
      <p class="wordmark">Remember<span>phrase</span></p>
      <p class="tagline">{copy.tagline}</p>
    </div>
    <div class="tools">
      <label class="language">
        <Icon name="globe" size={20} />
        <span class="visually-hidden">{copy.languageLabel}</span>
        <select bind:value={languageCode} disabled={words !== null}>
          {#each languages as l (l.code)}<option value={l.code}>{l.name}</option>{/each}
        </select>
      </label>
      <p class="chip {status.colour}" data-testid="status-chip">
        <Icon name={status.colour === 'red' ? 'hold' : status.colour === 'green' ? 'ready' : 'pending'} size={20} />
        {chip}
      </p>
    </div>
  </header>

  <nav class="stepper" aria-label="Progress">
    <ol>
      {#each copy.steps as step, i (step.name)}
        <li class:current={i === 0} aria-current={i === 0 ? 'step' : undefined}>
          <span class="dot">{i + 1}</span>
          <span class="step-text"><strong>{step.name}</strong><span>{step.hint}</span></span>
        </li>
      {/each}
    </ol>
  </nav>

  <main class="card">
    <section class="work" aria-labelledby="page-title">
      <h1 id="page-title">{copy.heading}</h1>
      <p class="intro">{copy.intro}</p>

      <StatusBand {status} />

      <ol class="stages">
        {#each order as key, i (key)}
          {@const pos = key === stage ? 'current' : order.indexOf(key) < order.indexOf(stage) ? 'done' : 'upcoming'}
          <li class="stage {pos}" aria-current={pos === 'current' ? 'step' : undefined}>
            <span class="marker" aria-hidden="true">
              {#if pos === 'done'}<Icon name="check" size={18} />{:else}{i + 1}{/if}
            </span>
            <div class="stage-body">
              <h2>{copy.stages[key]}</h2>

              {#if key === 'language'}
                {#if words}
                  <p class="summary">{copy.list.ready(count(words.length))}</p>
                {:else if pos === 'current'}
                  <p class="meta">{language.name} · {count(language.list.count)} words</p>
                  <button class="button primary" onclick={prepare} disabled={loading}>
                    <Icon name="download" />
                    {loading ? copy.list.loading : listError ? copy.list.retry : copy.list.action}
                  </button>
                  {#if listError}<p class="error" role="alert">{copy.list.errors[listError]}</p>{/if}
                {/if}
              {:else if key === 'offline'}
                {#if pos === 'current'}
                  <p class="meta">{copy.offline.lead}</p>
                  <ul class="platforms">
                    {#each copy.offline.platforms as p (p.name)}<li><strong>{p.name}:</strong> {p.how}</li>{/each}
                  </ul>
                  <p class="meta">{copy.offline.check}</p>
                  <div class="confirm-row">
                    <label class="confirm">
                      <input type="checkbox" bind:checked={osConfirmed} />
                      <span>{copy.offline.confirmLabel}</span>
                    </label>
                    <button class="button primary" onclick={confirmOffline} disabled={!osConfirmed || probe === 'pending'}>
                      <Icon name="offline" />
                      {copy.offline.confirm}
                    </button>
                  </div>
                {:else if pos === 'done'}
                  <p class="summary">{probe === 'skipped' ? copy.offline.skipped : copy.offline.noAnswer}</p>
                {/if}
              {:else if pos === 'current'}
                <button class="button secondary" onclick={sample} disabled={!canRunSample(readiness)}>
                  <Icon name="shuffle" />
                  {samples.length ? copy.sample.again : copy.sample.action}
                </button>
                {#if rngError}<p class="error" role="alert">{copy.sample.rngError}</p>{/if}
                {#each samples.slice(0, 2) as sampleSet, j (samples.length - j)}
                  <div class="sample" class:older={j > 0}>
                    <span class="tag">{copy.sample.tag}</span>
                    <ol class="tiles" aria-label={copy.sample.label(samples.length - j)}>
                      {#each sampleSet as word, w (w)}<li>{word}</li>{/each}
                    </ol>
                  </div>
                {/each}
                {#if sampleOk && status.canGenerate}<p class="summary">{copy.sample.nextStep}</p>{/if}
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <aside class="panel" aria-labelledby="panel-title">
      <h2 id="panel-title">{copy.panel[stage].title}</h2>
      {#each copy.panel[stage].body as line (line)}<p>{line}</p>{/each}
      <hr />
      <p class="small">{copy.panel.noStorage}</p>
      <p class="small">{copy.panel.attribution}</p>
    </aside>
  </main>
</div>

<ConfirmDialog open={probe === 'pending'} onskip={() => skipper?.abort()} />

<style>
  .canvas {
    position: relative;
    min-height: 100vh;
    padding: 1.25rem clamp(1rem, 4vw, 3rem) 2.5rem;
    overflow: hidden;
    isolation: isolate;
  }
  /* The yellow bands sit behind the card, never under text. */
  .canvas::before,
  .canvas::after {
    content: '';
    position: absolute;
    z-index: -1;
    background: var(--yellow);
  }
  .canvas::before {
    left: 0;
    top: 9rem;
    width: 22vw;
    height: 26rem;
    clip-path: polygon(0 18%, 100% 52%, 100% 74%, 0 100%);
  }
  .canvas::after {
    right: 0;
    top: 5.5rem;
    width: 20vw;
    height: 18rem;
    clip-path: polygon(0 34%, 100% 0, 100% 100%, 64% 100%);
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
    font-size: clamp(1.75rem, 3vw, 2.4rem);
    font-weight: 850;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .wordmark span {
    color: var(--yellow);
  }
  .tagline {
    margin: 0.35rem 0 0;
    font-size: 1rem;
    color: #dfe5f2;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .language {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #fff;
  }
  .language select {
    padding: 0.45rem 0.6rem;
    border: 1px solid #4a5d88;
    border-radius: 10px;
    background: var(--navy-900);
    font-weight: 650;
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
  .stepper li.current .dot {
    background: var(--yellow);
    color: var(--navy-950);
    box-shadow: 0 0 0 4px rgb(255 194 26 / 0.28);
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
  .sample,
  .confirm-row {
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

  .sample {
    position: relative;
    padding: 1.1rem 1rem 1rem;
    border: 2px dashed var(--cream-line);
    border-radius: var(--radius);
  }
  .sample.older {
    opacity: 0.6;
  }
  .tag {
    position: absolute;
    top: -0.7rem;
    left: 0.9rem;
    padding: 0 0.45rem;
    background: var(--paper);
    color: var(--amber);
    font-size: 0.85rem;
    font-weight: 750;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tiles li {
    padding: 0.7rem 0.5rem;
    border: 1px solid var(--cream-line);
    border-radius: 12px;
    background: var(--cream);
    font-size: 1.3rem;
    font-weight: 750;
    text-align: center;
    overflow-wrap: anywhere;
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
    .canvas::before,
    .canvas::after {
      display: none;
    }
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
    .tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
