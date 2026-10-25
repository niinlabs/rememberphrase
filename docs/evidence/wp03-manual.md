# WP03 manual check: Remember, login requirements and copy review

The browser tests cover the practice logic, the exact comparison, the requirements checklist and the layout. This record covers what they cannot: a real touch screen and on-screen keyboard, password managers, a screen reader, zoom, and the human reviews WP03 needs.

Use the setup from `docs/evidence/wp01-manual-offline.md`: run `pnpm preview:lan` on the computer, open the printed address on another device on the same network, fetch the words and go offline. Use a throwaway phrase, never one you will keep, and do not screenshot it.

## Steps

1. In **Make it yours**, open **Login requirements**. Enter a minimum length, tick **Needs a digit** and **Spaces aren't allowed**, then use **Add a number** and choose **Hyphen** under **Between words**. Expected: the checklist changes to Met, the preview shows the digit at the end, and "6 of 6 random words unchanged" stays. On a phone, the number fields and pickers are usable.
2. Select **Continue to Remember**. Expected: the length guidance, three tips, **Practise typing it**, then **Keep a recovery copy**. With 5 or fewer unchanged words, the guidance has the caution mark.
3. Without revealing the phrase, type it from memory and select **Check**. Then make a deliberate mistake in capitals or a separator and check again. Expected: "matches" for the exact phrase, "doesn't match yet" otherwise, and the phrase never appears by itself.
4. On a phone, with the on-screen keyboard open, tap the eye several times. Expected: the entry switches between dots and text, the keyboard stays open and the text is kept.
5. Watch for a password manager or the browser offering to save or fill the practice entry (iCloud Keychain, the browser's own manager, any installed extension). Expected: ideally none; note any prompt and which manager showed it.
6. Select **Show phrase**, then **Hide phrase**; **Try again**; **Skip practice**. Then go **Back to Make it yours**, change a word, and return. Expected: the field is empty, the phrase hidden and no old result shown.
7. Open **How strong is this phrase?** and **Want to know more?**. Expected: both are optional; nothing in them is needed to practise or to finish.
8. Select **Clear phrase**, first **Keep my phrase**, then **Clear phrase**. Expected: the phrase is gone from the page, the cleared message says the browser may keep its own records, and **Make another phrase** starts again with no login rules set.
9. With a screen reader on (VoiceOver, NVDA or TalkBack): reveal and hide the phrase, type in the practice field, toggle the eye, check, and open both disclosures. Expected: every control is named (**Show entry** / **Hide entry**, **Show phrase** / **Hide phrase**), the check result is read out, and the phrase is never read out unless revealed and navigated to.
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
