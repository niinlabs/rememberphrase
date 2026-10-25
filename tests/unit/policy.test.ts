import { expect, test } from 'vitest';
import { checkRules, NO_RULES, type Rules } from '../../src/core/policy';

// WP03 slice 3 fixtures: D9 destination rules, checked only when the user stated them.
const rules = (r: Partial<Rules>): Rules => ({ ...NO_RULES, ...r });
const met = (text: string, r: Partial<Rules>) => Object.fromEntries(checkRules(text, rules(r)).map((c) => [c.id, c.met]));

test('with no stated rules nothing is reported', () => {
  expect(checkRules('maple orbit lantern', NO_RULES)).toEqual([]);
});

test('only stated rules are reported, in a fixed order', () => {
  expect(checkRules('maple', rules({ symbol: true, minLength: 3 })).map((c) => c.id)).toEqual(['minLength', 'symbol']);
});

test('lengths count characters as the preview does', () => {
  expect(met('café', { minLength: 4, maxLength: 4 })).toEqual({ minLength: true, maxLength: true });
  expect(met('maple orbit', { minLength: 12 })).toEqual({ minLength: false });
  expect(met('maple orbit', { maxLength: 10 })).toEqual({ maxLength: false });
});

test('character classes: uppercase, lowercase, digit and symbol', () => {
  expect(met('maple-orbit', { upper: true, lower: true, digit: true, symbol: true })).toEqual({
    upper: false,
    lower: true,
    digit: false,
    symbol: true,
  });
  expect(met('MAPLE ORBIT7', { upper: true, lower: true, digit: true, symbol: true })).toEqual({
    upper: true,
    lower: false,
    digit: true,
    symbol: false, // a space is not a symbol
  });
  expect(met('Ölgemälde', { upper: true, lower: true })).toEqual({ upper: true, lower: true });
});

test('spaces not allowed catches the space separator and spaces inside words', () => {
  expect(met('maple orbit', { noSpaces: true })).toEqual({ noSpaces: false });
  expect(met('maple_orbit', { noSpaces: true })).toEqual({ noSpaces: true });
  expect(met('maple orbit', { noSpaces: true })).toEqual({ noSpaces: false });
});

test('a start-up screen or another keyboard layout allows plain keyboard characters only', () => {
  expect(met('Maple-orbit 7!', { plainKeyboard: true })).toEqual({ plainKeyboard: true });
  for (const text of ['café', 'maple orbit', 'smile😀'])
    expect(met(text, { plainKeyboard: true }), text).toEqual({ plainKeyboard: false });
});
