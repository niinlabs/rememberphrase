# WP02 manual check: Generate and Make it Yours

The browser tests cover the phrase logic, the offline gate and the layout. This record covers what they cannot: a real touch screen, an on-screen keyboard, a screen reader, and the copy review WP02 still needs.

Use the setup from `docs/evidence/wp01-manual-offline.md`: run `pnpm preview:lan` on the computer, open the printed address on another device on the same network, fetch the words and go offline. Step 2 opens by itself.

## Steps

1. On **Generate**, check that no word tiles appear before you select **Generate random words**. Generate six words. Expected: the status shrinks to one line with **Details**.
2. Change the count to 4, then to 12. Expected: the guidance changes, and raising the count keeps the existing words and locks.
3. Lock two words and select **Reroll unlocked words**. Expected: the locked words keep their word and position.
4. Select **Make it yours**. Expected: the phrase preview and **Between words** come before the word tiles.
5. On a touch screen, move a word by dragging its handle; then tap a word's handle and tap a **Move here** spot. Drag a connecting word into the phrase; then tap one and tap an **Insert here** spot.
6. Edit a word (for example, add a digit), join two words, split them again, and choose the hyphen separator. Expected: the preview matches each change exactly. On a phone, scroll down: the summary bar shows the same phrase and does not cover the field you are editing, also with the on-screen keyboard open.
7. Select **Reset my changes**. Then go **Back to Generate**, make an edit first if needed, and raise the count by one. Expected: no warning, and back on **Make it yours** your edit is kept with the new word at the end. Then select **Generate new words**. Expected: "Replace your arranged phrase?" appears before anything is replaced.
8. With a screen reader on (VoiceOver, NVDA or TalkBack): lock a word, generate, move a word with the arrow keys on its handle, and open and dismiss the replace warning. Expected: every control is reachable and named, and each move is announced.
9. Copy review: read the side-panel and status wording on **Generate** and **Make it yours**, especially that choosing which words to keep adds no strength and that replaced words, or words with letters removed, no longer count as random (capitals, look-alike swaps and added characters are fine). Expected: the wording is acceptable, or the changes needed are noted.

## Record

- Date: 2026-10-25
- Device and operating system: iPhone (iOS) and a Mac (macOS); versions not recorded
- Browser and version: Safari on the iPhone, Firefox on the Mac; versions not recorded
- Screen reader: not run; step 8 deferred
- Copy review notes: wording accepted for now (step 9)
- Notes: Includes the 2026-10-25 change to D5: raising the count after Make it Yours edits keeps the arranged phrase. Later on 2026-10-25, the phone summary bar was re-checked on the iPhone after it was changed to follow its own height: it looked right.
- Result: partial — steps 1–7 and 9 passed on both devices; step 8 deferred
