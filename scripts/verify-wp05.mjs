#!/usr/bin/env node
// WP05 verifier, the release proof: WP03 and WP04 hold; a clean checkout of the committed candidate
// builds; the build holds only expected files, the approved word list and no unexpected outside
// address; the live site serves exactly that build with the security headers and none of the
// unwanted ones; the whole-journey release test passes in every browser; no phrase reaches the
// browser's own files; and the human release checks are recorded. Prints PASS, FAIL or BLOCKED per
// check; exits non-zero unless all pass.
//
// Usage: ./scripts/verify-wp05.mjs [--site https://rememberphrase.com] [--skip-profile]
// The profile check opens Chrome and Firefox windows for about a minute; --skip-profile marks it BLOCKED.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { effLargeList } from '../src/wordlists.ts';
import { browserFixtures, check, checkAsync, finish, manualRecord, read, root, upstream } from './verify-lib.mjs';

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const site = new URL(arg('site', 'https://rememberphrase.com/'));
const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: 'true' } });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)).map((f) => `${name}/${f}`) : [name]));

// Outside addresses the build may contain: links a visitor can follow and strings that are never fetched.
const ALLOWED_URLS = [
  'https://rememberphrase.com/', // the link-preview tags
  'https://www.eff.org/', // the word-list attribution
  'https://shifteverywhere.com', // the sponsor link
  'https://github.com/niinlabs/rememberphrase', // the source link
  'https://svelte.dev/e/', // links in Svelte's own error messages
  'http://www.w3.org/', // SVG and XML namespace names
];

check('WP03 holds', () => upstream('scripts/verify-wp03.mjs', 'WP03'));
check('WP04 holds', () => upstream('scripts/verify-wp04.mjs', 'WP04'));

// The candidate is the committed HEAD, built from a fresh clone so nothing local can leak in.
const commit = sh('git', ['rev-parse', 'HEAD'], root).stdout.trim();
const dirty = sh('git', ['status', '--porcelain'], root).stdout.trim() !== '';
console.log(`Candidate: ${commit}${dirty ? ' (local changes are not part of it)' : ''}`);
let dist;
check('a clean checkout of the candidate builds', () => {
  const work = join(mkdtempSync(join(tmpdir(), 'verify-wp05-')), 'src');
  const steps = [
    ['git', ['clone', '--quiet', root, work], root],
    ['pnpm', ['install', '--frozen-lockfile'], work],
    ['pnpm', ['build'], work],
  ];
  for (const [cmd, args, cwd] of steps) {
    const r = sh(cmd, args, cwd);
    if (r.error) return ['BLOCKED', `could not run ${cmd} (${r.error.message})`];
    if (r.status !== 0) return `${cmd} ${args[0]} failed: ${(r.stderr || r.stdout).trim().split('\n').pop()}`;
  }
  dist = join(work, 'dist');
});

check('the build holds only expected files, the approved word list and no unexpected outside address', () => {
  if (!dist) return ['BLOCKED', 'no clean build'];
  const files = walk(dist);
  const unexpected = files.filter((f) => !/^(index\.html|reachability\.txt|social-preview\.png|wordlists\/eff-large-en\.txt|assets\/[\w-]+\.(js|css|png|webp))$/.test(f));
  if (unexpected.length) return `unexpected files: ${unexpected.join(', ')}`;
  if (sha(readFileSync(join(dist, 'wordlists/eff-large-en.txt'))) !== effLargeList.sha256) return 'the built word list differs from its manifest';
  const urls = files
    .filter((f) => /\.(js|css|html)$/.test(f))
    .flatMap((f) => [...readFileSync(join(dist, f), 'utf8').matchAll(/https?:\/\/[A-Za-z0-9.-]+[^\s"'`)<>\\]*/g)].map((m) => m[0]));
  const outside = [...new Set(urls.filter((u) => !ALLOWED_URLS.some((a) => u.startsWith(a))))];
  if (outside.length) return `unexpected outside addresses: ${outside.join(', ')}`;
});

await checkAsync(`${site.host} serves exactly the candidate build`, async () => {
  if (!dist) return ['BLOCKED', 'no clean build'];
  const differ = [];
  for (const file of walk(dist)) {
    let res;
    try {
      res = await fetch(new URL(file === 'index.html' ? '/' : `/${file}`, site), { cache: 'no-store' });
    } catch (e) {
      return ['BLOCKED', `${site.host} could not be reached (${e.cause?.code ?? e.message})`];
    }
    const live = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200 || sha(live) !== sha(readFileSync(join(dist, file)))) differ.push(`${file} (${res.status})`);
  }
  if (differ.length) return `the live site is not ${commit.slice(0, 7)}; differs in ${differ.join(', ')}`;
});

await checkAsync(`${site.host} sends the security headers everywhere, and no cookies or error reporting`, async () => {
  if (!dist) return ['BLOCKED', 'no clean build'];
  // Every add_header in the nginx configuration, value for value.
  const expected = [...(read('nginx/nginx.conf') + read('nginx/security-headers.conf')).matchAll(/^\s*add_header\s+(\S+)\s+"([^"]+)"/gm)].map((m) => [
    m[1].toLowerCase(),
    m[2],
  ]);
  const asset = walk(dist).find((f) => f.endsWith('.js'));
  const problems = [];
  for (const path of ['/', '/reachability.txt', '/wordlists/eff-large-en.txt', `/${asset}`, '/no-such-page']) {
    let res;
    try {
      res = await fetch(new URL(path, site), { cache: 'no-store', redirect: 'manual' });
    } catch (e) {
      return ['BLOCKED', `${site.host} could not be reached (${e.cause?.code ?? e.message})`];
    }
    for (const [name, value] of expected) if (res.headers.get(name) !== value) problems.push(`${path} ${name}`);
    for (const name of ['set-cookie', 'nel', 'report-to']) if (res.headers.has(name)) problems.push(`${path} sends ${name}`);
  }
  for (const from of [`http://${site.host}/`, `https://www.${site.host}/`]) {
    const res = await fetch(from, { redirect: 'manual' }).catch(() => null);
    if (!res || ![301, 308].includes(res.status) || res.headers.get('location') !== site.href) problems.push(`${from} does not redirect to ${site.href}`);
  }
  if (problems.length) return problems.join('; ');
});

check(`the whole-journey release test passes in ${BROWSERS.join(', ')}`, () => browserFixtures({ 'tests/e2e/release.e2e.ts': 1 }, BROWSERS));

check('no phrase reaches Chrome or Firefox profile files after a forced quit', () => {
  if (process.argv.includes('--skip-profile')) return ['BLOCKED', 'skipped; run without --skip-profile'];
  const r = sh('node', ['tests/security/profile-persistence.mjs', '--url', site.href], root);
  if (r.error) return ['BLOCKED', `could not run the profile check (${r.error.message})`];
  const lines = r.stdout.trim().split('\n');
  if (r.status === 2) return ['BLOCKED', lines.filter((l) => l.startsWith('BLOCKED')).join('; ')];
  if (r.status !== 0) return lines.filter((l) => l.startsWith('FOUND')).join('; ') || 'the profile check failed';
});

check('security, accessibility, newcomer and deployment reviews and the release decision are recorded', () =>
  existsSync(join(root, 'docs/release/wp05-manual.md')) ? manualRecord('docs/release/wp05-manual.md') : 'missing docs/release/wp05-manual.md',
);

finish('WP05');
