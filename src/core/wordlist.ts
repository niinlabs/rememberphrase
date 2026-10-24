export type Wordlist = { file: string; sha256: string; count: number };

// Word lists are fetched as data and must match the hash compiled into the bundle.
export async function loadWordlist(list: Wordlist): Promise<string[]> {
  const res = await fetch(list.file, { credentials: 'omit' });
  if (!res.ok) throw new Error(`The word list could not be loaded (${res.status}).`);
  const bytes = await res.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== list.sha256) throw new Error('The word list does not match the expected version.');
  const words = new TextDecoder('utf-8', { fatal: true }).decode(bytes).split('\n').filter(Boolean);
  if (words.length !== list.count || new Set(words).size !== words.length) {
    throw new Error('The word list is malformed.');
  }
  return words;
}
