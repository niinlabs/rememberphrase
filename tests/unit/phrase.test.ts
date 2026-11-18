import { describe, expect, test } from 'vitest';
import {
  canCombine,
  canReroll,
  canSplit,
  combine,
  canRemoveWord,
  drawsInPhrase,
  removeWord,
  decorate,
  DEFAULT_WORDS,
  drawFrom,
  duplicates,
  edit,
  generate,
  hasEdits,
  insertConnector,
  insertOwn,
  setTypeAdded,
  storyTexts,
  typedTokens,
  intactRandomWords,
  move,
  origin,
  phraseText,
  removeAdded,
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

  test('raising keeps the arranged phrase and adds the new word at its end; lowering resets it', () => {
    const arranged = insertConnector(setSeparator(edit(combine(six(), 'w0'), 'w2', 'Lantern1'), 'hyphen'), 'in', 1);
    const raised = setCount(arranged, 7, sequence('extra'));
    expect(phraseText(raised)).toBe(phraseText(arranged) + '-extra');
    expect(intactRandomWords(raised)).toBe(intactRandomWords(arranged) + 1);
    expect(phraseText(reset(raised))).toBe('maple orbit lantern velvet stork delay extra');
    expect(phraseText(setCount(raised, 6, sequence()))).toBe('maple orbit lantern velvet stork delay');
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

  test('a word dressed up with capitals, look-alike swaps or added characters stays random (D8 as amended 2026-11-18)', () => {
    const p = six();
    const at = (text: string) => edit(p, 'w0', text);
    expect(origin(p, p.tokens[0])).toBe('unchanged');
    for (const t of ['Maple', 'M4ple1!', 'app1e-maple', 'MAPLES', '#m@p1e', 'mAp1e7']) {
      expect(origin(at(t), at(t).tokens[0]), t).toBe('edited');
      expect(intactRandomWords(at(t)), t).toBe(6);
    }
  });

  test('a replaced word, or one with letters removed or split up, no longer counts', () => {
    const p = six();
    for (const t of ['sunshine', 'mplae', 'map', 'mple', 'm-a-p-l-e', 'map1le']) {
      const edited = edit(p, 'w0', t);
      expect(origin(edited, edited.tokens[0]), t).toBe('rewritten');
      expect(intactRandomWords(edited), t).toBe(5);
    }
  });

  test('connectors never count, and typing the original back restores the count', () => {
    let p = insertConnector(six(), 'with', 2);
    expect(intactRandomWords(p)).toBe(6);
    p = edit(p, 'w3', 'sunshine');
    expect(intactRandomWords(p)).toBe(5);
    p = edit(p, 'w3', 'velvet');
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

  test('adjacent words join, never across a connector, after the last word or onto an edited join', () => {
    const withConnector = insertConnector(six(), 'and', 1);
    expect(canCombine(withConnector, 'w0')).toBe(false); // next token is a connector
    expect(canCombine(six(), 'w5')).toBe(false); // nothing after the last word
    expect(canCombine(combine(six(), 'w0'), 'w0+w1')).toBe(true); // a join can grow (D12 as amended)
    const editedJoin = edit(combine(six(), 'w0'), 'w0+w1', 'mapleORBIT');
    expect(canCombine(editedJoin, 'w0+w1')).toBe(false); // its text no longer splits per draw
  });

  test('all six words join into one token that keeps six intact draws and splits back into six words', () => {
    let p = six();
    for (const id of ['w0', 'w0+w1', 'w0+w1+w2', 'w0+w1+w2+w3', 'w0+w1+w2+w3+w4']) p = combine(p, id);
    expect(texts(p)).toEqual(['mapleorbitlanternvelvetstorkdelay']);
    expect(intactRandomWords(p)).toBe(6);
    expect(origin(p, p.tokens[0])).toBe('combined');
    expect(split(p, p.tokens[0].id).tokens).toEqual(six().tokens);
  });

  test('a joined token may hold 32 characters per random word in it', () => {
    const joined = combine(combine(six(), 'w0'), 'w0+w1'); // three draws
    expect(() => edit(joined, 'w0+w1+w2', 'x'.repeat(96))).not.toThrow();
    expect(() => edit(joined, 'w0+w1+w2', 'x'.repeat(97))).toThrow(RangeError);
    expect(() => edit(six(), 'w0', 'x'.repeat(33))).toThrow(RangeError);
  });

  test('an unchanged combination splits back into the two original words without a new draw', () => {
    const p = split(combine(six(), 'w0'), 'w0+w1');
    expect(p.tokens).toEqual(six().tokens);
  });

  test('an edited combination cannot be split; each word still in it, in order, keeps counting', () => {
    const p = edit(combine(six(), 'w0'), 'w0+w1', 'MapleOrbit7');
    expect(canSplit(p, 'w0+w1')).toBe(false);
    expect(() => split(p, 'w0+w1')).toThrow(RangeError);
    expect(origin(p, p.tokens[0])).toBe('edited');
    expect(intactRandomWords(p)).toBe(6);
    expect(intactRandomWords(edit(p, 'w0+w1', 'Maple7'))).toBe(5); // orbit is gone
    expect(intactRandomWords(edit(p, 'w0+w1', 'orbitmaple'))).toBe(5); // out of order: only one is found after the other
    expect(origin(p, edit(p, 'w0+w1', 'sunrise').tokens[0])).toBe('rewritten');
  });

  test('a word edited before joining still splits back, keeping the edit and the other intact draw', () => {
    let p = combine(edit(six(), 'w0', 'Maple1'), 'w0');
    expect(texts(p)[0]).toBe('Maple1orbit');
    expect(canSplit(p, 'w0+w1')).toBe(true);
    expect(origin(p, p.tokens[0])).toBe('edited');
    expect(intactRandomWords(p)).toBe(6); // Maple1 is maple, dressed up
    p = split(p, 'w0+w1');
    expect(texts(p)).toEqual(['Maple1', 'orbit', 'lantern', 'velvet', 'stork', 'delay']);
    expect(intactRandomWords(p)).toBe(6);
  });

  test('credit follows the text: a join that holds both words whole counts both', () => {
    // "dinghy" + "geranium" edited to "dinghyg" + "eranium": dinghy is still whole, geranium lost a letter.
    let p = generate(4, sequence('dinghy', 'geranium', 'lantern', 'velvet'));
    p = edit(edit(p, 'w0', 'dinghyg'), 'w1', 'eranium');
    expect(intactRandomWords(p)).toBe(3);
    p = combine(p, 'w0');
    expect(texts(p)[0]).toBe('dinghygeranium');
    expect(intactRandomWords(p)).toBe(4); // the joined text holds both drawn words whole, in order
    expect(origin(p, p.tokens[0])).toBe('combined'); // and reads exactly as drawn
  });

  test('editing a join back to its joined text restores only what the parts had', () => {
    let p = combine(six(), 'w0');
    p = edit(edit(p, 'w0+w1', 'mapleorbit!'), 'w0+w1', 'mapleorbit');
    expect(intactRandomWords(p)).toBe(6);
    expect(origin(p, p.tokens[0])).toBe('combined');
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
    expect(() => removeAdded(p, 'w0')).toThrow(RangeError);
    expect(texts(removeAdded(p, 'c6'))).toEqual(texts(six()));
    expect(p.slots).toHaveLength(6);
  });

  test('every separator produces the exact string', () => {
    const p = setTypeAdded(insertConnector(combine(six(), 'w0'), 'in', 1), true);
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

describe('decoration (D9 as clarified 2026-10-25)', () => {
  test('capitals, a digit and a symbol are added to the exact string, at the end for digit and symbol', () => {
    const p = setSeparator(six(), 'hyphen');
    expect(phraseText(decorate(p, { capitalise: 'first' }))).toBe('Maple-orbit-lantern-velvet-stork-delay');
    expect(phraseText(decorate(p, { capitalise: 'every', digit: '7', symbol: '!' }))).toBe('Maple-Orbit-Lantern-Velvet-Stork-Delay7!');
    const withConnector = setTypeAdded(insertConnector(p, 'the', 0), true);
    expect(phraseText(decorate(withConnector, { capitalise: 'first' }))).toBe('The-maple-orbit-lantern-velvet-stork-delay');
    expect(phraseText(decorate(edit(p, 'w0', '9lives'), { capitalise: 'every' }))).toMatch(/^9lives-Orbit/);
  });

  test('decoration keeps every random word, as the same change typed by hand does', () => {
    const decorated = decorate(six(), { capitalise: 'every', digit: '3', symbol: '#' });
    expect(intactRandomWords(decorated)).toBe(6);
    expect(texts(decorated)).toEqual(texts(six()));
    expect(intactRandomWords(edit(six(), 'w0', 'Maple'))).toBe(6); // the same change typed by hand also keeps it
  });

  test('decoration counts as a change: Reset and lowering the count remove it, raising keeps it', () => {
    const decorated = decorate(six(), { digit: '1' });
    expect(hasEdits(decorated)).toBe(true);
    expect(hasEdits(decorate(decorated, { digit: null }))).toBe(false);
    expect(phraseText(reset(decorated))).toBe('maple orbit lantern velvet stork delay');
    expect(phraseText(setCount(decorated, 7, sequence('extra')))).toBe('maple orbit lantern velvet stork delay extra1');
    expect(phraseText(setCount(setCount(decorated, 7, sequence('extra')), 6, sequence()))).toBe('maple orbit lantern velvet stork delay');
  });

  test('only a single digit and the offered symbols are accepted', () => {
    for (const bad of [{ digit: '12' }, { digit: 'a' }, { symbol: '@' }, { symbol: '!!' }])
      expect(() => decorate(six(), bad)).toThrow(RangeError);
    expect(() => decorate(six(), { capitalise: 'shout' as never })).toThrow(RangeError);
  });
});

describe('removing words and the Nothing separator (2026-11-05)', () => {
  test('a removed word leaves the phrase and the counts; Reset brings it back; one word always stays', () => {
    const p = removeWord(six(), 'w2');
    expect(phraseText(p)).toBe('maple orbit velvet stork delay');
    expect(drawsInPhrase(p)).toBe(5);
    expect(intactRandomWords(p)).toBe(5);
    expect(hasEdits(p)).toBe(true);
    expect(phraseText(reset(p))).toBe('maple orbit lantern velvet stork delay');
    let one = six();
    for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) one = removeWord(one, id);
    expect(canRemoveWord(one)).toBe(false);
    expect(() => removeWord(one, 'w0')).toThrow(RangeError);
    expect(() => removeWord(insertConnector(six(), 'and', 1), 'c6')).toThrow(RangeError); // connectors have their own remove
  });

  test('removing a joined word removes all of its draws', () => {
    const p = removeWord(combine(six(), 'w0'), 'w0+w1');
    expect(drawsInPhrase(p)).toBe(4);
    expect(intactRandomWords(p)).toBe(4);
  });

  test('Nothing joins the whole phrase without separators', () => {
    expect(phraseText(setSeparator(six(), 'none'))).toBe('mapleorbitlanternvelvetstorkdelay');
  });
});

describe('typing the added words (D11 as amended 2026-11-17)', () => {
  test('connecting and own words are left out of the typed phrase unless the user chooses to type them', () => {
    const p = insertOwn(insertConnector(decorate(six(), { capitalise: 'first' }), 'the', 0), 'zebra', 7);
    expect(p.typeAdded).toBe(false);
    expect(phraseText(p)).toBe('Maple orbit lantern velvet stork delay');
    expect(typedTokens(p)).toHaveLength(6);
    const typed = setTypeAdded(p, true);
    expect(phraseText(typed)).toBe('The maple orbit lantern velvet stork delay zebra');
    expect(typedTokens(typed)).toHaveLength(8);
    expect(intactRandomWords(typed)).toBe(intactRandomWords(p));
    expect(hasEdits(setTypeAdded(six(), true))).toBe(true);
    expect(reset(typed).typeAdded).toBe(false);
    // The story shows every word cased as typed; untyped added words take capitals only from Every word.
    expect(storyTexts(p).join(' ')).toBe('the Maple orbit lantern velvet stork delay zebra');
    expect(storyTexts(typed).join(' ')).toBe(phraseText(typed));
    expect(storyTexts(decorate(p, { capitalise: 'every' })).join(' ')).toBe('The Maple Orbit Lantern Velvet Stork Delay Zebra');
  });
});

describe('your own words (D11 as amended 2026-11-05)', () => {
  test('an own word goes where it is put, can be edited and removed, and never counts as random', () => {
    let p = insertOwn(six(), 'my 2nd!', 2);
    expect(phraseText(setTypeAdded(p, true))).toBe('maple orbit my 2nd! lantern velvet stork delay');
    expect(intactRandomWords(p)).toBe(6);
    expect(drawsInPhrase(p)).toBe(6);
    expect(origin(p, p.tokens[2])).toBe('own');
    p = edit(p, 'o6', 'Café');
    expect(p.tokens[2].text).toBe('Café');
    expect(intactRandomWords(p)).toBe(6);
    expect(phraseText(removeAdded(p, 'o6'))).toBe(phraseText(six()));
  });

  test('own words follow the word rules, never join, and Reset removes them', () => {
    for (const bad of ['', ' lead', 'x'.repeat(33), 'a\tb']) expect(() => insertOwn(six(), bad, 0), bad).toThrow(RangeError);
    const p = insertOwn(six(), 'zebra', 1);
    expect(canCombine(p, 'w0')).toBe(false); // the next tile is your own word
    expect(canCombine(p, 'o6')).toBe(false);
    expect(hasEdits(p)).toBe(true);
    expect(phraseText(reset(p))).toBe(phraseText(six()));
    expect(() => removeAdded(six(), 'w0')).toThrow(RangeError); // random words go through removeWord
  });
});

