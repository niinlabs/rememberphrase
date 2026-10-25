// Phrase state for Generate and Make it Yours (WP02), following WP00 D4, D5, D8 and D10–D12.
// Pure functions over immutable values. Only generate, reroll and setCount draw words, and only
// through the Draw function the caller passes; editing operations cannot make random draws.
import { randomIndex } from './random';

export const MIN_WORDS = 4;
export const MAX_WORDS = 12;
export const DEFAULT_WORDS = 6;
export const MAX_WORD_LENGTH = 32;
export const CONNECTORS = ['the', 'a', 'and', 'in', 'on', 'with', 'for', 'of', 'to', 'at', 'under', 'near'] as const;
export const SEPARATORS = { space: ' ', hyphen: '-', period: '.', underscore: '_' } as const;

export type Separator = keyof typeof SEPARATORS;
export type Connector = (typeof CONNECTORS)[number];
export type Draw = () => string;

// A random draw. Its word changes only by reroll; locks protect it from rerolls, not from editing.
export type Slot = { id: number; word: string; locked: boolean };
// What the user arranges: one or two generated slots (combined), or a user-chosen connector.
// A joined word keeps each part's text as it was when joined, so it can be split back exactly.
export type Token =
  | { kind: 'word'; id: string; slots: number[]; text: string; parts?: string[] }
  | { kind: 'connector'; id: string; text: Connector };
// slots in generated order are the reset baseline; tokens and separator are the step-3 draft.
export type Phrase = { slots: Slot[]; tokens: Token[]; separator: Separator; nextId: number };

export type Origin = 'unchanged' | 'combined' | 'edited' | 'rewritten' | 'connector';
export type WordError = 'empty' | 'too-long' | 'control' | 'edge-space';

export const drawFrom =
  (words: readonly string[]): Draw =>
  () =>
    words[randomIndex(words.length)];

const wordToken = (slot: Slot): Token => ({ kind: 'word', id: `w${slot.id}`, slots: [slot.id], text: slot.word });
const baseline = (p: Phrase, slots = p.slots): Phrase => ({ ...p, slots, tokens: slots.map(wordToken), separator: 'space' });

function checkCount(count: number) {
  if (!Number.isInteger(count) || count < MIN_WORDS || count > MAX_WORDS) {
    throw new RangeError(`Word count must be ${MIN_WORDS}–${MAX_WORDS}`);
  }
}

function indexOf(p: Phrase, tokenId: string) {
  const i = p.tokens.findIndex((t) => t.id === tokenId);
  if (i < 0) throw new RangeError(`No token ${tokenId}`);
  return i;
}

// --- Generate step -------------------------------------------------------------------------

export function generate(count: number, draw: Draw): Phrase {
  checkCount(count);
  const slots = Array.from({ length: count }, (_, id) => ({ id, word: draw(), locked: false }));
  return baseline({ slots, tokens: [], separator: 'space', nextId: count });
}

export const canReroll = (p: Phrase) => p.slots.some((s) => !s.locked);

// New draws for unlocked slots only; locked words keep their value and position. Discards step-3
// changes (the caller warns first) and becomes the new reset baseline.
export function reroll(p: Phrase, draw: Draw): Phrase {
  if (!canReroll(p)) throw new RangeError('Unlock a word to reroll');
  return baseline(p, p.slots.map((s) => (s.locked ? s : { ...s, word: draw() })));
}

export const toggleLock = (p: Phrase, slotId: number): Phrase => ({
  ...p,
  slots: p.slots.map((s) => (s.id === slotId ? { ...s, locked: !s.locked } : s)),
});

export const unlockAll = (p: Phrase): Phrase => ({ ...p, slots: p.slots.map((s) => ({ ...s, locked: false })) });

// D5: how many words must be unlocked before the count can drop to `count` (0 when it can).
export function unlocksNeeded(p: Phrase, count: number) {
  const remove = p.slots.length - count;
  const unlocked = p.slots.filter((s) => !s.locked).length;
  return Math.max(0, remove - unlocked);
}

// D5: raising adds new draws at the end, also to the end of the step-3 draft, which it keeps.
// Lowering removes unlocked words from the end and never a locked one, and discards step-3 changes
// (the caller warns first).
export function setCount(p: Phrase, count: number, draw: Draw): Phrase {
  checkCount(count);
  if (unlocksNeeded(p, count) > 0) throw new RangeError(`Unlock ${unlocksNeeded(p, count)} more words first`);
  if (count > p.slots.length) {
    const added = Array.from({ length: count - p.slots.length }, (_, k) => ({ id: p.nextId + k, word: draw(), locked: false }));
    return { ...p, slots: [...p.slots, ...added], tokens: [...p.tokens, ...added.map(wordToken)], nextId: p.nextId + added.length };
  }
  if (count === p.slots.length) return baseline(p);
  const drop = new Set(p.slots.filter((s) => !s.locked).slice(count - p.slots.length).map((s) => s.id));
  return baseline(p, p.slots.filter((s) => !drop.has(s.id)));
}

// Words drawn more than once in the current set (D12: allowed, with a note).
export function duplicates(p: Phrase): Set<string> {
  const counts = new Map<string, number>();
  for (const s of p.slots) counts.set(s.word, (counts.get(s.word) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n > 1).map(([word]) => word));
}

// --- Make it Yours step --------------------------------------------------------------------

export const reset = (p: Phrase): Phrase => baseline(p);

export const hasEdits = (p: Phrase) =>
  p.separator !== 'space' || JSON.stringify(p.tokens) !== JSON.stringify(p.slots.map(wordToken));

export function move(p: Phrase, tokenId: string, to: number): Phrase {
  const tokens = [...p.tokens];
  const [token] = tokens.splice(indexOf(p, tokenId), 1);
  tokens.splice(Math.max(0, Math.min(to, tokens.length)), 0, token);
  return { ...p, tokens };
}

// D10: 1–32 characters, no line breaks, tabs or control characters, no leading or trailing space.
export function wordError(text: string): WordError | null {
  const t = text.normalize('NFC');
  if (t.length === 0) return 'empty';
  if ([...t].length > MAX_WORD_LENGTH) return 'too-long';
  if (/\p{Cc}/u.test(t)) return 'control';
  if (/^\s|\s$/u.test(t)) return 'edge-space';
  return null;
}

export function edit(p: Phrase, tokenId: string, text: string): Phrase {
  const token = p.tokens[indexOf(p, tokenId)];
  if (token.kind !== 'word') throw new RangeError('Only words can be edited');
  if (wordError(text)) throw new RangeError(`Invalid word: ${wordError(text)}`);
  const normalized = text.normalize('NFC');
  return { ...p, tokens: p.tokens.map((t) => (t.id === tokenId ? { ...token, text: normalized } : t)) };
}

const slotWord = (p: Phrase, id: number) => p.slots.find((s) => s.id === id)!.word;
export const originalText = (p: Phrase, token: Token) =>
  token.kind === 'word' ? token.slots.map((id) => slotWord(p, id)).join('') : token.text;

// D12: two adjacent single generated words, never connectors or an existing combination.
export function canCombine(p: Phrase, tokenId: string) {
  const i = indexOf(p, tokenId);
  const [a, b] = [p.tokens[i], p.tokens[i + 1]];
  return a?.kind === 'word' && b?.kind === 'word' && a.slots.length === 1 && b.slots.length === 1 && !wordError(a.text + b.text);
}

export function combine(p: Phrase, tokenId: string): Phrase {
  if (!canCombine(p, tokenId)) throw new RangeError('These words cannot be combined');
  const i = indexOf(p, tokenId);
  const [a, b] = p.tokens.slice(i, i + 2) as Extract<Token, { kind: 'word' }>[];
  const joined: Token = {
    kind: 'word',
    id: `${a.id}+${b.id}`,
    slots: [...a.slots, ...b.slots],
    text: a.text + b.text,
    parts: [a.text, b.text],
  };
  return { ...p, tokens: [...p.tokens.slice(0, i), joined, ...p.tokens.slice(i + 2)] };
}

// D12: a combination can be split while its text is unchanged since joining; Reset is the way back after an edit.
export function canSplit(p: Phrase, tokenId: string) {
  const token = p.tokens[indexOf(p, tokenId)];
  return token.kind === 'word' && !!token.parts && token.text === token.parts.join('');
}

export function split(p: Phrase, tokenId: string): Phrase {
  if (!canSplit(p, tokenId)) throw new RangeError('Only an unchanged combination can be split');
  const i = indexOf(p, tokenId);
  const joined = p.tokens[i] as Extract<Token, { kind: 'word' }>;
  const parts: Token[] = joined.slots.map((id, k) => ({ kind: 'word', id: `w${id}`, slots: [id], text: joined.parts![k] }));
  return { ...p, tokens: [...p.tokens.slice(0, i), ...parts, ...p.tokens.slice(i + 1)] };
}

export function insertConnector(p: Phrase, text: Connector, at: number): Phrase {
  if (!CONNECTORS.includes(text)) throw new RangeError(`Not an approved connector: ${text}`);
  const tokens = [...p.tokens];
  tokens.splice(Math.max(0, Math.min(at, tokens.length)), 0, { kind: 'connector', id: `c${p.nextId}`, text });
  return { ...p, tokens, nextId: p.nextId + 1 };
}

export function removeConnector(p: Phrase, tokenId: string): Phrase {
  if (p.tokens[indexOf(p, tokenId)].kind !== 'connector') throw new RangeError('Only connectors can be removed');
  return { ...p, tokens: p.tokens.filter((t) => t.id !== tokenId) };
}

export const setSeparator = (p: Phrase, separator: Separator): Phrase => ({ ...p, separator });

// The exact string the user will type: what the preview shows, copy copies and practice uses.
export const phraseText = (p: Phrase) => p.tokens.map((t) => t.text).join(SEPARATORS[p.separator]);

// --- Provenance (D8) -----------------------------------------------------------------------

// Familiar substitutions still count as the same letter when judging whether a word was edited.
const LOOKALIKES: Record<string, string> = { a: 'a4@', e: 'e3', i: 'i1!', l: 'l1', o: 'o0', s: 's5$', t: 't7' };
const escape = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Approved rule (WP02, 2026-10-24): "edited" means the original letters are still there in order,
// allowing case changes, familiar substitutions and characters added anywhere (before, after or
// between them); anything else counts as user-written. Strength (D8) is unaffected: both lose intact status.
function stillRecognisable(text: string, original: string) {
  const letters = [...original.toLowerCase()].map((c) => (LOOKALIKES[c] ? `[${escape(LOOKALIKES[c])}]` : escape(c)));
  return new RegExp(letters.join('.*?'), 'isu').test(text);
}

// How many random draws behind a token are still exactly as drawn. A joined word is judged only by
// the parts saved when it was joined, and only while its text is unchanged since joining: typing a
// join that happens to spell the original words never restores credit lost before joining.
function intactDraws(p: Phrase, token: Token) {
  if (token.kind !== 'word') return 0;
  if (!token.parts) return token.text === originalText(p, token) ? 1 : 0;
  if (token.text !== token.parts.join('')) return 0;
  return token.slots.filter((id, k) => token.parts![k] === slotWord(p, id)).length;
}

export function origin(p: Phrase, token: Token): Origin {
  if (token.kind === 'connector') return 'connector';
  if (intactDraws(p, token) === token.slots.length) return token.parts ? 'combined' : 'unchanged';
  return stillRecognisable(token.text, originalText(p, token)) ? 'edited' : 'rewritten';
}

// D8: random draws whose text is unchanged, counted through intactDraws.
export const intactRandomWords = (p: Phrase) => p.tokens.reduce((n, t) => n + intactDraws(p, t), 0);
