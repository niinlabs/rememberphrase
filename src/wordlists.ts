import type { Wordlist } from './core/wordlist';

// Test fixture only (NATO phonetic alphabet); far too small for a real passphrase.
export const fixtureList: Wordlist = {
  file: '/wordlists/fixture-en.txt',
  sha256: 'aec0f7cfc4373f5edf6e64782c78975e46c5fb907031bc291a6905efe6e3f389',
  count: 10,
};
