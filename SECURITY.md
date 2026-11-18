# Security

Rememberphrase helps people make a passphrase they will use for important accounts, so problems that could expose a phrase are taken seriously.

## Reporting a problem

Please report security problems privately through GitHub at <https://github.com/niinlabs/rememberphrase/security/advisories/new>. You can also find it on the repository page under **Security and quality → Advisories → Report a vulnerability**. Do not open a public issue.

Include what you found, the steps to reproduce it, and the browser and device you used. You will get a reply in the advisory thread. Once a fix is released, you can be credited if you wish.

## In scope

- A phrase, or any part of one, leaving the browser tab: a network request, a third-party resource, or anything that weakens the Content-Security-Policy in `nginx/security-headers.conf` and `vite.config.ts`.
- Anything the page stores: cookies, local or session storage, IndexedDB, caches or service workers.
- Weak or biased randomness when words are drawn.
- Wording that claims more than the page can promise, for example about strength or about being offline.
- The served word list differing from the published EFF Long Wordlist (see [ATTRIBUTION.md](ATTRIBUTION.md)).

## Out of scope

- The visitor's own device, operating system, browser or extensions, and anyone who can see the screen. The page says these are outside its control.
- Whether the device is really offline. The page cannot verify this and relies on the visitor's confirmation.
- Attacks that need control of the server or the domain, other than missing or weak security headers.

## Supported versions

Only the current `main` branch and the site deployed from it are supported.
