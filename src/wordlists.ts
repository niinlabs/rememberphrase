import type { Wordlist } from './core/wordlist';

// Manifest for the approved English list (WP00 D3). See ATTRIBUTION.md.
export const effLargeList = {
  file: '/wordlists/eff-large-en.txt',
  sha256: '6d557f0693958fb5e650b68b5bee585eb82cf4da32965505c789e924743bc522',
  count: 7776,
  source: 'https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt',
  sourceSha256: 'addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e',
  licence: 'CC BY 4.0',
} satisfies Wordlist & Record<string, unknown>;
