# WP03 manual check: Remember, login requirements and copy review

The browser tests cover the practice logic, the exact comparison, the requirements checklist and the layout. This record covers what they cannot: a real touch screen and on-screen keyboard, password managers, a screen reader, zoom, and the human reviews WP03 needs.

Use the setup from `docs/evidence/wp01-manual-offline.md`: run `pnpm preview:lan` on the computer, open the printed address on another device on the same network, fetch the words and go offline. Use a throwaway phrase, never one you will keep, and do not screenshot it.

## Steps

1. In **Make it yours**, open **External password requirements**. Enter a minimum length, tick **Needs a digit** and **Spaces aren't allowed**, then use **Add a number** and choose **Hyphen** under **Between words**. Expected: the checklist changes to Met, the preview shows the digit at the end, and no tile changes from **Random word**. On a phone, the number fields and pickers are usable.
2. Select **Continue to Remember**. Expected: **Make it stick** in one sentence with **Memory ideas** closed, then the **Practise typing it** card, **Keep a recovery copy** with **Clear phrase**, and **How strong is this phrase?** below it with one filled dot per random word. Go back, change a word to "Badg3r"-style (capitals, a swap, a digit added) and return: the dot stays filled. Replace a word or remove a letter: that dot is hollow, the count says "5 of 6 words still random", and the caution shows at the top of the step.
3. Without revealing the phrase, type it from memory. Then make a deliberate mistake in capitals or a separator and press Enter. Expected: "matches" appears by itself as soon as the exact phrase is typed, with **Next attempt**; Enter on a mistake says "doesn't match yet"; the phrase never appears by itself.
4. On a phone, with the on-screen keyboard open, tap the eye several times. Expected: the entry switches between dots and text, the keyboard stays open and the text is kept.
5. Watch for a password manager or the browser offering to save or fill the practice entry (iCloud Keychain, the browser's own manager, any installed extension). Expected: ideally none; note any prompt and which manager showed it.
6. Select **Reveal whole phrase**, then **Hide whole phrase**; **Next attempt** after a match; the clear button in the field. Then go **Back to Make it yours**, change a word, and return. Expected: the field is empty, the phrase hidden and no old result shown.
6a. In **Make it yours**, add two connecting words and leave **Include connecting words in the phrase** off, then continue. Expected: in Make it yours **Your chosen phrase** leaves them out and shows the full story under **With connecting words**, with the connecting words set apart; in Remember, **Reveal as you type** with **Show connecting words** ticked shows them set apart as not typed, with each random word as dots, and practice matches the phrase without them. Tick the box and repeat: the story line goes away, the aid shows them in place with the separators, and practice now needs them.
6b. In **Practise typing it**, try each aid. Expected: **No aid** is selected on arrival and shows nothing; **Follow along** shows the phrase faintly and lights it as you type, stopping at a mistake; **Reveal as you type** shows dots that turn into characters as you type correctly, stopping at a mistake; neither lights anything past a mistake. On a phone, switching aids keeps what you typed.
7. Open **What counts?** and **Want to know more?**. Expected: both are optional; nothing in them is needed to practise or to finish.
8. Select **Clear phrase**, first **Keep my phrase**, then **Clear phrase**. Expected: the phrase is gone from the page, the cleared message says the browser may keep its own records, and **Make another phrase** starts again with no login rules set.
9. With a screen reader on (VoiceOver, NVDA or TalkBack): choose each aid, reveal and hide the whole phrase, type in the practice field, toggle the eye, check, and open the disclosures. Expected: every control is named (the aids as radio buttons under **Help while you type**, **Show entry** / **Hide entry**, **Reveal whole phrase** / **Hide whole phrase**; **Show connecting words** as a checkbox; each run of dots is read as its number of hidden characters), the check result and the as-you-go results are read out, and the phrase is never read out unless revealed and navigated to.
10. At 200% browser zoom on a desktop, go through Remember and the requirements section. Expected: nothing is cut off and there is no sideways scrolling.
11. Copy review (Niclas): read all of Step 4, the requirements section and its checklist fixes, the strength details and **Want to know more?**. Expected: the wording is acceptable, or the changes needed are noted.
12. Security reading (someone other than the author): read the practice, recovery, strength and requirements wording against D8, D9, D13 and D14 in `docs/decisions/wp00.md`. Expected: no claim goes further than the decisions allow (no "secure", acceptance or erasure promises), or the problems are noted.

## Record

- Date:
- Device and operating system:
- Browser and version:
- Password manager prompts seen:
- Screen reader:
- Copy review notes:
- Security reader and notes:
- Notes:
- Result: not yet run
