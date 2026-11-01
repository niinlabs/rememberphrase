<script lang="ts">
  import { copy } from '../copy';
  import Icon from './Icon.svelte';

  // WP04: an unnumbered introduction. Nothing here fetches, checks or draws; Step 1 owns all of that.
  let { onstart }: { onstart: () => void } = $props();
</script>

<h1 id="page-title" tabindex="-1">{copy.landing.heading}</h1>
{#each copy.landing.intro as line (line)}<p class="intro">{line}</p>{/each}

<section aria-labelledby="examples-title">
  <h2 id="examples-title">{copy.landing.examplesTitle}</h2>
  <div class="examples">
    {#each copy.landing.examples as example (example.story)}
      <figure class="example">
        <p class="label">{copy.landing.wordsLabel}</p>
        <ul class="words">
          {#each example.words as word (word)}<li>{word}</li>{/each}
        </ul>
        <p class="label">{copy.landing.storyLabel}</p>
        <!-- Connecting words are set apart, so the six list words stay recognisable in the story. -->
        <p class="story" data-testid="example-story">
          <!-- Svelte drops whitespace between elements, so the spaces between words are written out. -->
          {#each example.story.split(' ') as token, i (i)}{i > 0 ? ' ' : ''}<span class:connector={!example.words.includes(token)}>{token}</span>{/each}
        </p>
      </figure>
    {/each}
  </div>
  <p class="only"><strong>{copy.landing.examplesOnly}</strong> {copy.landing.examplesNote}</p>
</section>

<section aria-labelledby="next-title">
  <h2 id="next-title">{copy.landing.nextTitle}</h2>
  <ol class="next">
    {#each copy.landing.next as step (step)}<li>{step}</li>{/each}
  </ol>
  <p class="help">{copy.landing.tabNote}</p>
</section>

<div class="footer">
  <button class="button primary" onclick={onstart}>
    {copy.landing.start}
    <Icon name="forward" />
  </button>
</div>

<style>
  h1 {
    margin: 0;
    font-size: clamp(1.9rem, 3.6vw, 2.7rem);
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-wrap: balance;
  }
  h1:focus {
    outline: none;
  }
  .intro {
    margin: 0.6rem 0 0;
    max-width: 44rem;
    font-size: 1.12rem;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  h2 {
    margin: 1.5rem 0 0.6rem;
    font-size: 1.2rem;
  }

  .examples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    gap: 0.9rem;
  }
  .example {
    margin: 0;
    padding: 0.9rem 1rem 1rem;
    border: 1px solid var(--cream-line);
    border-radius: 18px;
    background: var(--cream);
  }
  .label {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 750;
    letter-spacing: 0.02em;
    color: var(--ink-soft);
  }
  .words {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.35rem 0 0.8rem;
    padding: 0;
    list-style: none;
  }
  .words li {
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--cream-line);
    border-radius: 999px;
    background: var(--paper);
    font-weight: 650;
  }
  .story {
    margin: 0.35rem 0 0;
    padding: 0.7rem 0.9rem;
    border-radius: var(--radius);
    background: var(--navy-900);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 750;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .story .connector {
    font-weight: 450;
    color: #b9c3da;
  }
  .only {
    margin: 0.8rem 0 0;
    line-height: 1.5;
  }

  .next {
    margin: 0;
    padding-left: 1.3rem;
    line-height: 1.6;
  }
  .help {
    margin: 0.5rem 0 0;
    color: var(--ink-soft);
  }
  .footer {
    margin-top: 1.4rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
</style>
