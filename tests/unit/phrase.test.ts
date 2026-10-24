import { describe, expect, test } from 'vitest';
import {
  canCombine,
  canReroll,
  canSplit,
  combine,
  DEFAULT_WORDS,
  drawFrom,
  duplicates,
  edit,
  generate,
  hasEdits,
  insertConnector,
  intactRandomWords,
  move,
  origin,
  phraseText,
  removeConnector,
  reroll,
  reset,
  setCount,
  setSeparator,
  split,
  toggleLock,
  unlockAll,
  unlocksNeeded,
  wordError,
  type Draw,
  type Phrase,
} from '../../src/core/phrase';

// Hands out the given words in order and fails on any draw the test did not expect.
function sequence(...words: string[]): Draw & { left: () => number } {
  const queue = [...words];
  return Object.assign(
    () => {
      if (!queue.length) throw new Error('unexpected draw');
      return queue.shift()!;
    },
    { left: () => queue.length },
  );
}

const six = () => generate(6, sequence('maple', 'orbit', 'lantern', 'velvet', 'stork', 'delay'));
const words = (p: Phrase) => p.slots.map((s) => s.word);
const texts = (p: Phrase) => p.tokens.map((t) => t.text);

describe('generate, lock and reroll', () => {
  test('generates the requested number of words in draw order', () => {
    const p = six();
    expect(DEFAULT_WORDS).toBe(6);
    expect(words(p)).toEqual(['maple', 'orbit', 'lantern', 'velvet', 'stork', 'delay']);
    expect(p.slots.every((s) => !s.locked)).toBe(true);
    expect(phraseText(p)).toBe('maple orbit lantern velvet stork delay');
  });

  test('only counts of 4–12 are allowed', () => {
    for (const n of [3, 13, 4.5]) expect(() => generate(n, sequence())).toThrow(RangeError);
    expect(words(generate(4, sequence('a', 'b', 'c', 'd')))).toHaveLength(4);
  });

  test('a reroll redraws only unlocked words and keeps locked words in value and position', () => {
    const draw = sequence('one', 'two', 'three', 'four');
    const p = reroll(toggleLock(toggleLock(six(), 1), 4), draw);
    expect(words(p)).toEqual(['one', 'orbit', 'two', 'three', 'stork', 'four']);
    expect(p.slots.map((s) => s.locked)).toEqual([false, true, false, false, true, false]);
    expect(draw.left()).toBe(0);
  });

  test('with every word locked there is nothing to reroll', () => {
    let p = six();
    for (const s of p.slots) p = toggleLock(p, s.id);
    expect(canReroll(p)).toBe(false);
    expect(() => reroll(p, sequence())).toThrow('Unlock a word to reroll');
    expect(canReroll(unlockAll(p))).toBe(true);
  });

  test('a reroll discards step-3 changes and becomes the new reset baseline', () => {
    let p = insertConnector(setSeparator(edit(six(), 'w0', 'Maple1!'), 'hyphen'), 'in', 1);
    expect(hasEdits(p)).toBe(true);
    p = reroll(p, sequence('a', 'b', 'c', 'd', 'e', 'f'));
    expect(hasEdits(p)).toBe(false);
    expect(texts(p)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(reset(p)).toEqual(p);
  });

  test('duplicate draws are allowed and reported', () => {
    const p = generate(6, sequence('maple', 'orbit', 'maple', 'velvet', 'stork', 'delay'));
    expect([...duplicates(p)]).toEqual(['maple']);
    expect(duplicates(six()).size).toBe(0);
  });
});

describe('changing the count (D5)', () => {
  test('raising adds new draws at the end and keeps existing words and locks', () => {
    const p = setCount(toggleLock(six(), 2), 8, sequence('extra', 'more'));
    expect(words(p)).toEqual(['maple', 'orbit', 'lantern', 'velvet', 'stork', 'delay', 'extra', 'more']);
    expect(p.slots[2].locked).toBe(true);
  });

  test('lowering removes unlocked words from the end and never a locked one', () => {
    let p = generate(8, sequence('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'));
    p = toggleLock(toggleLock(p, 2), 7);
    expect(words(setCount(p, 5, sequence()))).toEqual(['a', 'b', 'c', 'd', 'h']);
  });

  test('lowering past the locks is refused with how many words to unlock', () => {
    let p = generate(8, sequence('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'));
    for (const id of [0, 1, 2, 3, 4, 5]) p = toggleLock(p, id);
    expect(unlocksNeeded(p, 4)).toBe(2);
    expect(() => setCount(p, 4, sequence())).toThrow(RangeError);
    expect(unlocksNeeded(p, 6)).toBe(0);
    expect(words(setCount(p, 6, sequence()))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  test('the same count keeps every word', () => {
    expect(words(setCount(six(), 6, sequence()))).toEqual(words(six()));
  });
});

describe('editing and provenance (D8, D10)', () => {
  test('word rules: 1–32 characters, no control characters or edge spaces', () => {
    expect(wordError('maple')).toBeNull();
    expect(wordError('')).toBe('empty');
    expect(wordError('x'.repeat(33))).toBe('too-long');
    expect(wordError('a\nb')).toBe('control');
    expect(wordError('a\tb')).toBe('control');
    expect(wordError(' maple')).toBe('edge-space');
    expect(wordError('Måple')).toBeNull(); // non-ASCII is allowed; the keyboard warning is separate
    expect(() => edit(six(), 'w0', '')).toThrow(RangeError);
  });

  test('edits are stored in Unicode NFC', () => {
    expect(edit(six(), 'w0', 'café').tokens[0].text).toBe('café');
  });

  test('origin tells unchanged, edited and user-written words apart', () => {
    const p = six();
    const at = (text: string) => origin(edit(p, 'w0', text), edit(p, 'w0', text).tokens[0]);
    expect(origin(p, p.tokens[0])).toBe('unchanged');
    for (const t of ['Maple', 'M4ple1!', 'app1e-maple', 'MAPLES', 'map1le', 'm-a-p-l-e']) expect(at(t), t).toBe('edited');
    const ex = generate(4, sequence('exorcism', 'orbit', 'lantern', 'velvet'));
    expect(origin(edit(ex, 'w0', 'ex1orcism'), edit(ex, 'w0', 'ex1orcism').tokens[0])).toBe('edited'); // inserted between letters
    for (const t of ['sunshine', 'mplae', 'map']) expect(at(t), t).toBe('rewritten');
  });

  test('intact random words drop with each edited word; connectors never count', () => {
    let p = six();
    expect(intactRandomWords(p)).toBe(6);
    p = insertConnector(p, 'with', 2);
    expect(intactRandomWords(p)).toBe(6);
    p = edit(p, 'w3', 'sunshine');
    expect(intactRandomWords(p)).toBe(5);
    p = edit(p, 'w3', 'velvet'); // typing the original back restores intact status
    expect(intactRandomWords(p)).toBe(6);
  });
});

describe('combining and splitting (D12)', () => {
  test('two adjacent words combine into one typed token that still counts as two draws', () => {
    const p = combine(six(), 'w0');
    expect(texts(p)).toEqual(['mapleorbit', 'lantern', 'velvet', 'stork', 'delay']);
    expect(origin(p, p.tokens[0])).toBe('combined');
    expect(intactRandomWords(p)).toBe(6);
    expect(p.slots).toEqual(six().slots); // draws and locks are untouched
  });

  test('only two single generated words can combine', () => {
    const withConnector = insertConnector(six(), 'and', 1);
    expect(canCombine(withConnector, 'w0')).toBe(false); // next token is a connector
    expect(canCombine(combine(six(), 'w0'), 'w0+w1')).toBe(false); // already a combination
    expect(canCombine(six(), 'w5')).toBe(false); // nothing after the last word
    const long = edit(edit(six(), 'w0', 'x'.repeat(20)), 'w1', 'y'.repeat(20));
    expect(canCombine(long, 'w0')).toBe(false); // would exceed 32 characters
  });

  test('an unchanged combination splits back into the two original words without a new draw', () => {
    const p = split(combine(six(), 'w0'), 'w0+w1');
    expect(p.tokens).toEqual(six().tokens);
  });

  test('an edited combination cannot be split and loses both intact draws', () => {
    const p = edit(combine(six(), 'w0'), 'w0+w1', 'MapleOrbit7');
    expect(canSplit(p, 'w0+w1')).toBe(false);
    expect(() => split(p, 'w0+w1')).toThrow(RangeError);
    expect(origin(p, p.tokens[0])).toBe('edited');
    expect(intactRandomWords(p)).toBe(4);
  });

  test('a word edited before joining still splits back, keeping the edit and the other intact draw', () => {
    let p = combine(edit(six(), 'w0', 'Maple1'), 'w0');
    expect(texts(p)[0]).toBe('Maple1orbit');
    expect(canSplit(p, 'w0+w1')).toBe(true);
    expect(origin(p, p.tokens[0])).toBe('edited');
    expect(intactRandomWords(p)).toBe(5); // orbit is still an untouched draw
    p = split(p, 'w0+w1');
    expect(texts(p)).toEqual(['Maple1', 'orbit', 'lantern', 'velvet', 'stork', 'delay']);
    expect(intactRandomWords(p)).toBe(5);
  });

  test('a lock protects a word from rerolls, not from combining, editing or moving', () => {
    let p = toggleLock(six(), 0);
    p = move(edit(combine(p, 'w0'), 'w0+w1', 'Mapleorbit'), 'w0+w1', 3);
    expect(texts(p)).toEqual(['lantern', 'velvet', 'stork', 'Mapleorbit', 'delay']);
    expect(p.slots[0].locked).toBe(true);
  });
});

describe('connectors, separators, reset and the exact string (D10, D11)', () => {
  test('only approved connectors can be inserted, moved and removed; words cannot be removed', () => {
    let p = insertConnector(six(), 'with', 1);
    expect(texts(p)).toEqual(['maple', 'with', 'orbit', 'lantern', 'velvet', 'stork', 'delay']);
    expect(() => insertConnector(p, 'xyz' as 'with', 0)).toThrow(RangeError);
    p = move(p, 'c6', 0);
    expect(texts(p)[0]).toBe('with');
    expect(origin(p, p.tokens[0])).toBe('connector');
    expect(() => removeConnector(p, 'w0')).toThrow(RangeError);
    expect(texts(removeConnector(p, 'c6'))).toEqual(texts(six()));
    expect(p.slots).toHaveLength(6);
  });

  test('every separator produces the exact string', () => {
    const p = insertConnector(combine(six(), 'w0'), 'in', 1);
    expect(phraseText(p)).toBe('mapleorbit in lantern velvet stork delay');
    expect(phraseText(setSeparator(p, 'hyphen'))).toBe('mapleorbit-in-lantern-velvet-stork-delay');
    expect(phraseText(setSeparator(p, 'period'))).toBe('mapleorbit.in.lantern.velvet.stork.delay');
    expect(phraseText(setSeparator(p, 'underscore'))).toBe('mapleorbit_in_lantern_velvet_stork_delay');
  });

  test('the string keeps case, symbols and order exactly as typed', () => {
    const p = move(edit(six(), 'w2', 'L@ntern!'), 'w2', 0);
    expect(phraseText(p)).toBe('L@ntern! maple orbit velvet stork delay');
  });

  test('reset restores the generated set with its current locks and default separator', () => {
    const base = toggleLock(six(), 3);
    let p = insertConnector(combine(edit(base, 'w2', 'L@ntern!'), 'w4'), 'near', 0);
    p = setSeparator(move(p, 'w0', 4), 'underscore');
    expect(hasEdits(p)).toBe(true);
    const restored = reset(p);
    expect(restored.tokens).toEqual(base.tokens);
    expect(restored.separator).toBe('space');
    expect(restored.slots).toEqual(base.slots);
    expect(hasEdits(restored)).toBe(false);
  });

  test('reordering alone counts as a change', () => {
    expect(hasEdits(move(six(), 'w0', 2))).toBe(true);
  });
});

test('drawFrom only returns words from the list', () => {
  const list = ['alpha', 'bravo', 'charlie'];
  const draw = drawFrom(list);
  for (let i = 0; i < 50; i++) expect(list).toContain(draw());
});
