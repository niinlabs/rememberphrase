# WP05 manual check: release proof

`./scripts/verify-wp05.mjs` covers what a script can prove:
- a clean build of the committed candidate, holding only expected files and outside addresses;
- that the live site serves exactly that build, with the security headers and no cookies or error reporting;
- the whole-journey release test in Chromium, Firefox and WebKit;
- the forced-quit search of Chrome and Firefox profiles for the phrase.

This record covers what it cannot: independent reviews, newcomers using the site, a rollback, and the release decision.

Run the verifier first and note the candidate commit it prints. Every step below is about that commit, as served at https://rememberphrase.com.

## Steps

1. **Security review** by someone other than the author. Read `docs/decisions/wp00.md` (D8, D9, D13, D14), `SECURITY.md`, the security headers in `nginx/security-headers.conf`, and the site's own wording about offline, storage and strength. Expected: no claim goes further than the decisions allow, and no finding of high severity is left open. Note each finding and what was done about it.
2. **Accessibility pass** on the live site, with the keyboard only, with a screen reader (VoiceOver, NVDA or TalkBack), at 200% zoom and with reduced motion on, through the whole journey from the landing page to Clear phrase. Expected: every control can be reached and is named, every result is read out, and nothing is clipped or needs sideways scrolling.
3. **Newcomers**: watch at least two people who have not seen Rememberphrase make and practise a phrase on their own device, without help. Afterwards, ask what the site does not guarantee. Expected: they finish, and can say that the page cannot verify their device is offline and does not keep their phrase. Note where they hesitated.
4. **Rollback**: deploy the previous release, check that it is served, then deploy the candidate again and check that `./scripts/verify-wp05.mjs` passes its live-site checks. Expected: both deployments work, and the time each took is noted.
5. **Release decision** (maintainer): read the open limitations in the reviews above and in `docs/evidence/`, then decide whether this candidate is released. Expected: an explicit go or no-go with the candidate commit.

## Record

- Date:
- Candidate commit:
- Security reviewer and findings:
- Accessibility pass (devices, screen readers, findings):
- Newcomers (how many, notes):
- Rollback (from which commit, times, notes):
- Release decision (go or no-go, by whom):
- Notes:
- Result: not yet run
