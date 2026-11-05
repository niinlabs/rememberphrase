# Rememberphrase

**Random start. Your story. A passphrase you can remember.**

Rememberphrase is a guided web page for creating and learning one of the few passwords you need to remember, such as a password-manager master password or a computer login. It is not a password manager.

## Status

In final testing before the first public release. Manual, accessibility and release checks are recorded in [docs/evidence](docs/evidence).

## How it works

1. Choose a language while online. Its word list loads into the open browser tab.
2. Disconnect from every network (for example, turn on Airplane mode) and confirm it on the page.
3. Generate 4–12 random words. Keep the ones you like and reroll the rest.
4. Arrange, join and edit the words into a phrase you can picture, add connecting words or your own, and check it against your login's requirements.
5. Practise typing it, keep a recovery copy on paper, and learn how password managers and two-factor authentication fit in.

## Design requirements

- Words are chosen in your browser using the Web Crypto API. No phrase is generated or processed on a server.
- No cookies, browser storage, service worker, analytics or third-party scripts.
- No network requests while generating, editing or practising a phrase.
- Strength guidance is based on how the words were generated. Reordering, edits and added characters are not counted as extra randomness.
- The page cannot verify that your device is offline. It relies on your confirmation and says so.

Automated tests check these requirements on every run; manual and release checks are recorded before release.

## Tech stack

Svelte, TypeScript and Vite, built as a static site. Tests use Vitest and Playwright.

## Development

Requires Node.js 24 or later, pnpm, and Firefox installed in its default location (the Firefox tests use it).

```bash
pnpm install
pnpm exec playwright install chromium webkit   # browsers for the end-to-end tests
pnpm test                      # unit tests
pnpm check                     # type checking
pnpm test:e2e                  # builds the site and runs browser tests
pnpm preview:lan               # serves the site over HTTPS on your local network for device testing
./scripts/verify-wp00.mjs      # checks the WP00 decisions and word-list evidence
./scripts/verify-wp01.mjs      # checks the Prepare step; needs a recorded real-device run
./scripts/verify-wp02.mjs      # checks Generate and Make it Yours; needs a recorded device and copy review
./scripts/verify-wp03.mjs      # checks Remember and login requirements; needs recorded device, copy and security reviews
./scripts/verify-wp04.mjs      # checks the landing page; needs recorded device, copy and newcomer checks
```

Approved project decisions are recorded in [docs/decisions](docs/decisions).

## License

Licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Rememberphrase name. The English word list is the EFF Long Wordlist (CC BY 4.0); see [ATTRIBUTION.md](ATTRIBUTION.md).
