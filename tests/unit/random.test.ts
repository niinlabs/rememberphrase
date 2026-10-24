import { expect, test } from 'vitest';
import { randomIndex } from '../../src/core/random';

// For n = 10 the largest unbiased value is 2^32 - 7 (4294967289).
const fillWith = (values: number[]) => (a: Uint32Array) => {
  a[0] = values.shift()!;
  return a;
};

test('redraws values that would bias the result', () => {
  const values = [2 ** 32 - 1, 2 ** 32 - 6, 23];
  expect(randomIndex(10, fillWith(values))).toBe(3);
  expect(values).toEqual([]);
});

test('accepts the largest unbiased value', () => {
  expect(randomIndex(10, fillWith([2 ** 32 - 7]))).toBe(9);
});

test('rejects invalid list sizes', () => {
  for (const n of [0, 1.5, 2 ** 32 + 1]) expect(() => randomIndex(n)).toThrow(RangeError);
});

test('spreads real draws evenly across the list', () => {
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 100_000; i++) counts[randomIndex(10)]++;
  // Expected 10,000 each; ±1,000 is over 10 standard deviations, so this does not flake.
  for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(1_000);
});
