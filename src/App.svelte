<script lang="ts">
  // Validation spike for the tech stack and WP00 decisions; not the WP01 interface.
  import { effLargeList } from './wordlists';
  import { loadWordlist } from './core/wordlist';
  import { checkReachability, type ProbeResult } from './core/reachability';
  import { sampleWords } from './core/random';
  import { canRunSample, connectionStatus, type Readiness, type Status } from './core/status';

  let words = $state<string[] | null>(null);
  let listError = $state('');
  let osConfirmed = $state(false);
  let probe = $state<ProbeResult | 'pending' | null>(null);
  let skipper: AbortController | null = null;
  let sampleOk = $state(false);
  let browserOnline = $state(navigator.onLine);
  let reconnected = $state(false);
  let samples = $state<string[][]>([]);
  let sampleError = $state('');

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

  const copy: Record<string, string> = {
    'site-answered': 'Rememberphrase answered, so you are still connected. Generation is held; check Airplane mode and confirm again.',
    'network-answered':
      'A network answered (this can be a Wi-Fi login page). You may still be connected. Generation is held; check Airplane mode and confirm again.',
    reconnected: 'Your browser reported a connection. Generation is paused; check Airplane mode and confirm again.',
    list: 'Load the word list while you are still online.',
    rng: 'Secure random numbers are not available in this browser, so no words can be generated.',
    unconfirmed: 'Offline status not confirmed. Check your device, then confirm.',
    sample: 'Offline status not confirmed. Try a disposable sample.',
    skipped: 'You skipped the connection check. You confirmed offline; word list ready in this tab.',
    'browser-online': 'Your browser still reports a network connection. This can be a VPN or virtual adapter; check Airplane mode.',
    green: 'You confirmed offline; word list ready in this tab. The site cannot verify Airplane mode.',
  };
  const label = (s: Status) =>
    s.colour === 'red' ? 'Hold:' : s.colour === 'green' ? 'Ready:' : s.canGenerate ? 'Caution:' : 'Not ready:';

  async function load() {
    listError = '';
    try {
      words = await loadWordlist(effLargeList);
    } catch (e) {
      listError = (e as Error).message;
    }
  }

  async function confirmOffline() {
    reconnected = false;
    skipper = new AbortController();
    probe = 'pending';
    probe = await checkReachability(skipper.signal);
  }

  function online() {
    browserOnline = true;
    if (probe !== null) reconnected = true;
  }

  function sample() {
    sampleError = '';
    try {
      samples.push(sampleWords(words!, 6));
      sampleOk = true;
    } catch {
      sampleError = 'Secure random numbers are not available in this browser.';
    }
  }
</script>

<svelte:window ononline={online} onoffline={() => (browserOnline = false)} />

<main>
  <h1>Rememberphrase</h1>
  <p>Technical spike. Never use the sample words below as a password.</p>

  <p role="status" class="band {status.colour}">
    <strong>{label(status)}</strong>
    {copy[status.colour === 'green' ? 'green' : status.reason]}
  </p>

  <section aria-labelledby="list-title">
    <h2 id="list-title">1. Word list</h2>
    <button onclick={load} disabled={words !== null}>Load word list</button>
    <p role="status">
      {#if words}Word list ready in this tab ({words.length} words).{:else if listError}{listError}{/if}
    </p>
  </section>

  <section aria-labelledby="offline-title">
    <h2 id="offline-title">2. Go offline</h2>
    <label>
      <input type="checkbox" bind:checked={osConfirmed} />
      I have turned on Airplane mode and checked my device
    </label>
    <button onclick={confirmOffline} disabled={!words || !osConfirmed || probe === 'pending'}>Confirm offline</button>

    {#if probe === 'pending'}
      <div role="dialog" aria-labelledby="probe-title" aria-describedby="probe-note">
        <span class="spinner" aria-hidden="true"></span>
        <h3 id="probe-title">Confirming offline</h3>
        <p id="probe-note">We are trying to reach Rememberphrase. If we cannot, that does not prove your computer is offline.</p>
        <button onclick={() => skipper?.abort()}>Skip, I'm offline</button>
      </div>
    {/if}

    <p role="status">
      {#if probe === 'no-answer'}Could not reach Rememberphrase. This does not prove your computer is offline.{/if}
    </p>
  </section>

  <section aria-labelledby="sample-title">
    <h2 id="sample-title">3. Disposable sample</h2>
    <button onclick={sample} disabled={!canRunSample(readiness)}>Generate disposable sample</button>
    <p role="status">{sampleError}</p>
    {#each samples as words, i (i)}
      <ol aria-label="Disposable sample {i + 1}">
        {#each words as word, j (j)}<li>{word}</li>{/each}
      </ol>
    {/each}
  </section>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 40rem;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  .band {
    border: 3px solid;
    padding: 0.75rem;
  }
  .red {
    border-color: #b00020;
  }
  .amber {
    border-color: #8a5a00;
  }
  .green {
    border-color: #1b6e2d;
  }
  [role='dialog'] {
    border: 2px solid currentColor;
    padding: 1rem;
    margin-top: 1rem;
  }
  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 3px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
