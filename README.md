# Rememberphrase

**Random start. Your story. A passphrase you can remember.**

Rememberphrase is a guided web page for creating and learning one of the few passwords you need to remember, such as a password-manager master password or a computer login. It is not a password manager.

## Status

Being prepared for its first public release. The automated tests pass; manual device, screen-reader and copy checks are recorded in [docs/evidence](docs/evidence) as they are completed.

## How it works

1. Choose a language (English for now) while online. Its word list loads into the open browser tab.
2. Disconnect from every network (Airplane mode on a phone, or Wi-Fi off and cables unplugged on a computer) and confirm it on the page.
3. Generate 4–12 random words. Keep the ones you like and reroll the rest.
4. Arrange, join and edit the words into a phrase you can picture, add connecting words or your own, and check it against your login's requirements.
5. Practise typing it, keep a recovery copy on paper, and learn how password managers and two-factor authentication fit in.

## Design requirements

- Words are chosen in your browser using the Web Crypto API. No phrase is generated or processed on a server.
- No cookies, browser storage, service worker, analytics or third-party scripts.
- No network requests while generating, editing or practising a phrase.
- Strength guidance is based on how the words were generated. Reordering, capitals, look-alike swaps and added characters are not counted as extra randomness, and a replaced word, or one with letters removed, stops counting.
- The page cannot verify that your device is offline. It relies on your confirmation and says so.

Automated tests check these requirements on every run; manual and release checks are recorded before release.

## Tech stack

Svelte, TypeScript and Vite, built as a static site. Tests use Vitest and Playwright.

## Development

Requires Node.js 24 or later, pnpm, and Firefox installed in its default location (the Firefox tests use it).

```bash
git clone https://github.com/niinlabs/rememberphrase.git
cd rememberphrase
pnpm install
pnpm dev                       # local development server (without the production headers)
pnpm exec playwright install chromium webkit   # browsers for the end-to-end tests
pnpm test                      # unit tests
pnpm check                     # type checking
pnpm test:e2e                  # builds the site and runs browser tests
pnpm preview:lan               # serves the site over HTTPS on your local network for device testing
```

The type check, unit tests and browser tests also run on GitHub Actions for every push to `main` and every pull request ([test.yml](.github/workflows/test.yml)). There, the browser tests use Playwright's own Firefox. Dependabot proposes updates to the pinned actions and the npm packages once a week ([dependabot.yml](.github/dependabot.yml)).

Approved project decisions are recorded in [docs/decisions](docs/decisions).

### Release checks

The project was built in work packages, WP00 to WP04. Each has a verifier in `scripts/` that runs its automated checks. From WP01 on, a verifier prints PASS only once the matching manual record in [docs/evidence](docs/evidence) has a date and a passing result:

```bash
./scripts/verify-wp00.mjs      # decisions and word-list evidence
./scripts/verify-wp01.mjs      # Prepare step
./scripts/verify-wp02.mjs      # Generate and Make it yours
./scripts/verify-wp03.mjs      # Remember and login requirements
./scripts/verify-wp04.mjs      # landing page
```

## Deploying

The guarantee that a phrase cannot leave the tab rests on the response headers, above all the Content-Security-Policy. Copying the built `dist/` folder to a host without them removes that protection without any visible sign.

- **With Docker:** the [Dockerfile](Dockerfile) builds the site and serves it with nginx and the headers in [nginx/security-headers.conf](nginx/security-headers.conf). The container listens on HTTP port 8080; put it behind HTTPS.
- **Elsewhere:** serve `dist/` (from `pnpm build`) with the same headers as `nginx/security-headers.conf`.

The browser tests run under a copy of the Content-Security-Policy, Referrer-Policy and Permissions-Policy in `vite.config.ts`. Keep those three identical in both files.

## Contributing

Issues are welcome. Please open an issue before a pull request, so the change can be agreed first. To report a security problem, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

Licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Rememberphrase name. The English word list is the EFF Long Wordlist (CC BY 4.0); see [ATTRIBUTION.md](ATTRIBUTION.md).
