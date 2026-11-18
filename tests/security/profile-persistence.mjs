#!/usr/bin/env node
// WP05: does a phrase reach the browser's own files? For each browser, in a fresh profile: make a
// phrase, edit a word to a marker, type the phrase unmasked in practice, wait for session saving, then
// force-quit without Clear phrase and search every file in the profile for the phrase and the marker,
// as UTF-8 and UTF-16, also inside Firefox's compressed session-restore files.
//
// Usage: node tests/security/profile-persistence.mjs [--url https://rememberphrase.com] [--browser chromium|firefox]
// Opens visible browser windows: session restore is only written for real windows.
// Prints one line per browser and exits 0 when nothing was found, 1 when a phrase was found and
// 2 when a browser could not be run.
//
// shortcut: compressed LevelDB blocks (Chrome's Local/Session Storage, IndexedDB) are searched raw, not
// decompressed; the site writes none of them (the release test checks this), so they hold no page data.
import { chromium, firefox } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copy } from '../../src/copy.ts';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'https://rememberphrase.com/');
const only = arg('browser');
const MARKER = 'Qzmarkerwp05';
const SAVE_WAIT_MS = 20_000; // Firefox saves the session every 15 seconds; Chrome sooner

// Firefox's mozLz40 files: an 8-byte magic, a 4-byte size, then one LZ4 block. Decoding stops at that
// size, as a cache entry can carry its own metadata after the block.
function mozLz4(buf) {
  if (buf.subarray(0, 8).toString('latin1') !== 'mozLz40\0') return null;
  const src = buf.subarray(12);
  const out = Buffer.alloc(buf.readUInt32LE(8));
  let i = 0;
  let o = 0;
  while (i < src.length && o < out.length) {
    const token = src[i++];
    let len = token >> 4;
    if (len === 15) for (let b = 255; b === 255; len += b) b = src[i++];
    src.copy(out, o, i, i + len);
    i += len;
    o += len;
    if (i >= src.length || o >= out.length) break;
    const offset = src[i] | (src[i + 1] << 8);
    i += 2;
    let match = (token & 15) + 4;
    if ((token & 15) === 15) for (let b = 255; b === 255; match += b) b = src[i++];
    for (let k = 0; k < match; k++, o++) out[o] = out[o - offset];
  }
  if (o !== out.length) throw new Error(`could not decode a mozLz4 file: ${o} of ${out.length} bytes`);
  return out;
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue; // sockets and files removed while walking
    }
    if (st.isDirectory()) yield* files(path);
    else if (st.isFile()) yield path;
  }
}

function search(dir, needles) {
  const hits = [];
  const forms = needles.flatMap((n) => [Buffer.from(n, 'utf8'), Buffer.from(n, 'utf16le')].map((b) => [n, b]));
  for (const path of files(dir)) {
    let bytes;
    try {
      bytes = readFileSync(path);
    } catch {
      continue;
    }
    for (const [label, data] of [['', bytes], [' (decompressed)', mozLz4(bytes)]]) {
      if (!data) continue;
      for (const [needle, form] of forms) if (data.includes(form)) hits.push(`${needle} in ${path.slice(dir.length + 1)}${label}`);
    }
  }
  return [...new Set(hits)];
}

// Force-quit: SIGKILL every process started with this profile, as a crash or forced quit would.
function forceQuit(dir) {
  const ps = execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' });
  for (const line of ps.split('\n')) {
    if (!line.includes(dir)) continue;
    try {
      process.kill(Number(line.trim().split(/\s+/)[0]), 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

async function run(name) {
  const dir = mkdtempSync(join(tmpdir(), `wp05-${name}-`));
  const options = { headless: false, viewport: { width: 1280, height: 900 } };
  // Playwright's bundled Firefox does not start on macOS 27, so the installed Firefox is used there (as in tests).
  const launcher = name === 'firefox' ? firefox : chromium;
  const context = await launcher.launchPersistentContext(dir, name === 'firefox' ? { ...options, channel: 'moz-firefox' } : options);
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url);
    await page.getByRole('button', { name: copy.landing.start }).click();
    await page.getByRole('button', { name: copy.list.action }).click();
    await page.getByText(copy.list.ready('English', '7,776')).waitFor();
    await context.setOffline(true);
    await page.getByLabel(copy.offline.confirmLabel).check();
    await page.getByRole('button', { name: copy.offline.confirm }).click();
    await page.getByRole('button', { name: copy.generate.generate }).click();
    await page.getByRole('button', { name: copy.generate.continue }).click();
    await page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(1)},`) }).fill(MARKER);
    const phrase = await page.getByTestId('phrase-preview').innerText();
    await page.getByRole('button', { name: copy.compose.continue }).click();
    await page.getByRole('button', { name: copy.remember.showEntry }).click(); // unmasked, the harder case
    await page.getByLabel(copy.remember.attemptLabel, { exact: true }).pressSequentially(phrase);
    await page.locator('.result', { hasText: copy.remember.match }).waitFor();
    await page.waitForTimeout(SAVE_WAIT_MS);
    forceQuit(dir);
    await context.close().catch(() => {});
    // Control: the page's address must be in the session-restore files, or the browser saved no session
    // and a clean result would mean nothing.
    const host = new URL(url).host;
    // In Firefox it must be found in the decoded text, which also proves the decoder works.
    const session = search(dir, [host]).filter((h) => (name === 'firefox' ? /sessionstore.*\(decompressed\)/ : /Sessions\//).test(h));
    if (!session.length) throw new Error('no session-restore file holds the page address, so the search proves nothing');
    // Single drawn words are not searched: ordinary English words also occur in the browser's own files.
    return { name, found: search(dir, [phrase, MARKER]), session };
  } finally {
    await context.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

let status = 0;
for (const name of only ? [only] : ['chromium', 'firefox']) {
  try {
    const { found, session } = await run(name);
    if (found.length) {
      status = 1;
      console.log(`FOUND   ${name}: ${found.join('; ')}`);
    } else {
      console.log(`CLEAN   ${name}: no phrase or marker in the profile; session saved (${session[0]})`);
    }
  } catch (e) {
    status = Math.max(status, 2);
    console.log(`BLOCKED ${name}: ${e.message.split('\n')[0]}`);
  }
}
process.exit(status);
