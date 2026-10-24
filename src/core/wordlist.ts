export type Wordlist = { file: string; sha256: string; count: number };

export class WordlistError extends Error {
  reason: 'download' | 'version' | 'malformed';
  constructor(reason: WordlistError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

// Word lists are fetched as data and must match the hash compiled into the bundle.
export async function loadWordlist(list: Wordlist): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(list.file, { credentials: 'omit' });
  } catch {
    throw new WordlistError('download');
  }
  if (!res.ok) throw new WordlistError('download');
  const bytes = await res.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== list.sha256) throw new WordlistError('version');
  let words: string[];
  try {
    words = new TextDecoder('utf-8', { fatal: true }).decode(bytes).split('\n').filter(Boolean);
  } catch {
    throw new WordlistError('malformed');
  }
  if (words.length !== list.count || new Set(words).size !== words.length) throw new WordlistError('malformed');
  return words;
}
