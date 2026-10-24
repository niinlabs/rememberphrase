<script lang="ts">
  // Validation spike for the tech stack; not the WP01 interface.
  import { fixtureList } from './wordlists';
  import { loadWordlist } from './core/wordlist';
  import { checkReachability, type ProbeResult } from './core/reachability';
  import { sampleWords } from './core/random';

  let words = $state<string[] | null>(null);
  let listError = $state('');
  let osConfirmed = $state(false);
  let probe = $state<ProbeResult | 'pending' | null>(null);
  let skipper: AbortController | null = null;
  let samples = $state<string[][]>([]);
  let sampleError = $state('');

  const canSample = $derived(words !== null && osConfirmed && (probe === 'unreachable' || probe === 'skipped'));

  async function load() {
    listError = '';
    try {
      words = await loadWordlist(fixtureList);
    } catch (e) {
      listError = (e as Error).message;
    }
  }

  async function confirmOffline() {
    skipper = new AbortController();
    probe = 'pending';
    probe = await checkReachability(skipper.signal);
  }

  function sample() {
    sampleError = '';
    try {
      samples.push(sampleWords(words!, 6));
    } catch {
      sampleError = 'Secure random numbers are not available in this browser.';
    }
  }
</script>

<main>
  <h1>Rememberphrase</h1>
  <p>Technical spike. Uses a fixture word list; never use these words as a password.</p>

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
      {#if probe === 'reachable'}
        Rememberphrase answered, so a connection may be active. Generation is held; check Airplane mode and try again.
      {:else if probe === 'unreachable'}
        Could not reach Rememberphrase. This does not prove your computer is offline.
      {:else if probe === 'skipped'}
        You skipped the connection check.
      {/if}
    </p>
  </section>

  <section aria-labelledby="sample-title">
    <h2 id="sample-title">3. Disposable sample</h2>
    <button onclick={sample} disabled={!canSample}>Generate disposable sample</button>
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
