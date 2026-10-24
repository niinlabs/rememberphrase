# Rememberphrase

**Random words. Your story. A passphrase you can remember.**

Rememberphrase is a guided web page for creating and learning one of the few passwords you need to remember, such as a password-manager master password or a computer login. It is not a password manager.

## Status

Early development. Nothing in this repository is ready for use. Do not use it to create a real password.

## How it will work

1. Choose a language while online. Its word list loads into the open browser tab.
2. Turn on Airplane mode and check that the page still works offline.
3. Generate 4–12 random words. Keep the ones you like and reroll the rest.
4. Arrange and edit the words into a phrase you can picture, and check it against your login's requirements.
5. Practise remembering it, and learn how password managers and two-factor authentication fit in.

## Design requirements

- Words are chosen in your browser using the Web Crypto API. No phrase is generated or processed on a server.
- No cookies, browser storage, service worker, analytics or third-party scripts.
- No network requests while generating, editing or practising a phrase.
- Strength guidance is based on how the words were generated. Reordering, edits and added characters are not counted as extra randomness.
- The page cannot verify that your device is offline. It relies on your confirmation and says so.

These requirements will be verified by automated and manual tests before any release.

## Tech stack

Svelte, TypeScript and Vite, built as a static site. Tests use Vitest and Playwright.

## License

Licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Rememberphrase name.
