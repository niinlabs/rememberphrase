#!/usr/bin/env node
// Serves the built site over HTTPS on this computer's local network address, for the real-device
// offline exercise (docs/evidence/wp01-manual-offline.md). Another device on the same network opens
// it; switching that device offline really cuts it off, which localhost cannot reproduce.
// Uses a self-signed certificate kept in .cert/ (gitignored) and renewed when it expires; the device shows
// a warning to accept once per certificate.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);

// Prefer Wi-Fi or Ethernet (en*) over VPN tunnels; PREVIEW_HOST overrides.
const addresses = Object.entries(networkInterfaces()).flatMap(([name, list]) =>
  (list ?? []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ name, address: a.address })),
);
const host = process.env.PREVIEW_HOST ?? (addresses.find((a) => a.name.startsWith('en')) ?? addresses[0])?.address;
if (!host) throw new Error('No local network address found. Connect to Wi-Fi or set PREVIEW_HOST.');

const key = `.cert/${host}-key.pem`;
const cert = `.cert/${host}-cert.pem`;
// openssl exits non-zero once the certificate has expired; then a new one is made.
const expired = () => spawnSync('openssl', ['x509', '-checkend', '0', '-noout', '-in', cert]).status !== 0;
if (!existsSync(cert) || expired()) {
  mkdirSync('.cert', { recursive: true });
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
    '-subj', '/CN=Rememberphrase local preview',
    '-addext', `subjectAltName=IP:${host}`,
    '-addext', 'extendedKeyUsage=serverAuth',
    '-keyout', key, '-out', cert,
  ], { stdio: 'ignore' });
}

await build({ logLevel: 'warn' });
const server = await preview({
  preview: { host, port: 4443, strictPort: true, https: { key: readFileSync(key), cert: readFileSync(cert) } },
});
console.log(`\nOpen on the other device: https://${host}:4443/`);
console.log('Accept the certificate warning once (the certificate is self-signed for this test).');
console.log('Press Ctrl+C to stop.\n');
process.on('SIGINT', () => server.close().then(() => process.exit(0)));
