# WP04 manual check: the landing page

The browser tests cover the first view, the start button, the absence of requests and storage, the examples and narrow layouts. This record covers what they cannot: a real phone, a screen reader, zoom, the copy review and whether a newcomer understands the page.

Open the site fresh (a new private window, or `pnpm preview:lan` on a phone).

## Steps

1. On a phone and on a desktop, read the page top to bottom. Expected: the examples are readable, nothing is cut off, and **Start making a passphrase** is the only button in the main card.
2. Using only the keyboard, Tab to **Start making a passphrase** and press Enter. Expected: Step 1 opens with the focus on its heading, and no word list is fetched until **Fetch words** is selected.
3. With a screen reader on (VoiceOver, NVDA or TalkBack), read the page. Expected: the order is heading, introduction, examples, the "Examples only" note, what happens next, then the button; each example story is read as separate words.
4. At 200% browser zoom on a desktop, and with reduced motion switched on, read the page. Expected: no sideways scrolling and nothing clipped.
5. Copy review (maintainer): the introduction, both examples, the "Examples only" note, "What happens next", the tab note and the "Before you start" panel. Decide whether one example would be enough. Expected: the wording is acceptable, or the changes needed are noted.
6. Newcomer check: ask someone who has not seen Rememberphrase to read the page and then explain, in their own words, what the site does, what it is not, and why they fetch words online before going offline. Expected: they can answer all three; note anything they misunderstood.

## Record

- Date:
- Device and operating system:
- Browser and version:
- Screen reader:
- Copy review notes:
- Newcomer notes:
- Notes:
- Result: not yet run
