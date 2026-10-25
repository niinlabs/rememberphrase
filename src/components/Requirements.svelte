<script lang="ts">
  import { untrack } from 'svelte';
  import { copy } from '../copy';
  import { CAPITALISE, decorate, DECORATION_SYMBOLS, phraseText, type Phrase } from '../core/phrase';
  import { checkRules, type Rules } from '../core/policy';
  import Icon from './Icon.svelte';

  // D9: optional login rules (volatile, held by App) and the decoration controls that help meet them.
  let { phrase = $bindable(), rules = $bindable() }: { phrase: Phrase; rules: Rules } = $props();

  const checks = $derived(checkRules(phraseText(phrase), rules));
  const metCount = $derived(checks.filter((c) => c.met).length);
  const options = ['upper', 'lower', 'digit', 'symbol', 'noSpaces', 'plainKeyboard'] as const;
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  // Open on return when something is already set, so stated rules are never hidden behind a click.
  let open = $state(
    untrack(() => checks.length > 0 || phrase.decoration.capitalise !== 'none' || !!phrase.decoration.digit || !!phrase.decoration.symbol),
  );

  function setLength(key: 'minLength' | 'maxLength', value: string) {
    const n = Number.parseInt(value, 10);
    rules = { ...rules, [key]: Number.isInteger(n) && n > 0 ? n : null };
  }

  const ruleText = (id: keyof Rules) =>
    id === 'minLength' || id === 'maxLength' ? copy.requirements.rule[id](rules[id]!) : copy.requirements.rule[id];
</script>

<details class="requirements" bind:open>
  <summary>
    <span class="title">{copy.requirements.title}</span>
    <span class="status">{checks.length ? copy.requirements.summary(metCount, checks.length) : copy.requirements.notSpecified}</span>
  </summary>
  <p class="help">{copy.requirements.intro}</p>

  <div class="rules">
    {#each ['minLength', 'maxLength'] as const as key (key)}
      <label class="length">
        <span>{copy.requirements[key]}</span>
        <input type="number" min="1" max="999" inputmode="numeric" value={rules[key] ?? ''} oninput={(e) => setLength(key, e.currentTarget.value)} />
      </label>
    {/each}
    {#each options as id (id)}
      <label class="option">
        <input type="checkbox" checked={rules[id]} onchange={(e) => (rules = { ...rules, [id]: e.currentTarget.checked })} />
        <span>{copy.requirements.options[id]}</span>
      </label>
    {/each}
  </div>

  {#if checks.length}
    <h3>{copy.requirements.checklistTitle}</h3>
    <ul class="checklist" data-testid="checklist">
      {#each checks as check (check.id)}
        <li class:met={check.met}>
          <Icon name={check.met ? 'check' : 'caution'} size={18} />
          <span>
            <strong>{ruleText(check.id)}:</strong>
            {check.met ? copy.requirements.met : copy.requirements.notMet}.
            {#if !check.met}{copy.requirements.fix[check.id]}{/if}
          </span>
        </li>
      {/each}
    </ul>
    <p class="help">{copy.requirements.otherRules}</p>
  {/if}

  <h3>{copy.requirements.fitTitle}</h3>
  <fieldset class="capitalise">
    <legend>{copy.requirements.capitaliseLegend}</legend>
    {#each CAPITALISE as mode (mode)}
      <label>
        <input
          type="radio"
          name="capitalise"
          checked={phrase.decoration.capitalise === mode}
          onchange={() => (phrase = decorate(phrase, { capitalise: mode }))}
        />
        {copy.requirements.capitalise[mode]}
      </label>
    {/each}
  </fieldset>
  <div class="extras">
    <label>
      <span>{copy.requirements.digitLabel}</span>
      <select value={phrase.decoration.digit ?? ''} onchange={(e) => (phrase = decorate(phrase, { digit: e.currentTarget.value || null }))}>
        <option value="">{copy.requirements.none}</option>
        {#each digits as d (d)}<option value={d}>{d}</option>{/each}
      </select>
    </label>
    <label>
      <span>{copy.requirements.symbolLabel}</span>
      <select value={phrase.decoration.symbol ?? ''} onchange={(e) => (phrase = decorate(phrase, { symbol: e.currentTarget.value || null }))}>
        <option value="">{copy.requirements.none}</option>
        {#each DECORATION_SYMBOLS as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </label>
  </div>
  <p class="help">{copy.requirements.fitNote}</p>
</details>

<style>
  .requirements {
    margin: 0.2rem 0 1rem;
    padding: 0.7rem 1rem;
    border: 1px solid var(--cream-line);
    border-radius: 16px;
    background: var(--paper);
  }
  summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.8rem;
    cursor: pointer;
  }
  .title {
    font-weight: 700;
  }
  .status {
    color: var(--ink-soft);
  }
  h3 {
    margin: 1rem 0 0.4rem;
    font-size: 1rem;
  }
  .help {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
    color: var(--ink-soft);
  }
  .rules {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.5rem 1.2rem;
    margin-top: 0.7rem;
  }
  .length {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .length input {
    width: 5rem;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 2px solid var(--cream-line);
    border-radius: 10px;
    background: #fff;
  }
  .option {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    cursor: pointer;
  }
  .option input,
  .capitalise input {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
    margin-top: 0.15rem;
    accent-color: var(--navy-900);
  }
  .checklist {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .checklist li {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
  }
  .checklist li :global(svg) {
    flex: none;
    margin-top: 0.1rem;
  }
  .capitalise {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0;
    padding: 0;
    border: none;
  }
  .capitalise legend {
    float: left;
    margin-right: 0.5rem;
    font-weight: 650;
  }
  .capitalise label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .extras {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.5rem;
    margin-top: 0.7rem;
  }
  .extras label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .extras select {
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 2px solid var(--cream-line);
    border-radius: 10px;
    background: #fff;
  }
</style>
