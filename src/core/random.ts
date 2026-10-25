// Uniform index in [0, n) from the browser's cryptographic RNG.
// Values at or above the largest multiple of n are redrawn, so there is no modulo bias.
export function randomIndex(
  n: number,
  fill: (a: Uint32Array<ArrayBuffer>) => unknown = (a) => crypto.getRandomValues(a),
): number {
  if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) throw new RangeError(`Invalid list size: ${n}`);
  const limit = 2 ** 32 - (2 ** 32 % n);
  const buf = new Uint32Array(1);
  for (;;) {
    fill(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}
