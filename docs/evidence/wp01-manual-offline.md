# WP01 manual offline exercise

The browser tests emulate going offline. This record covers the real thing: a real device, a real network switch-off and the built site served over HTTPS. Localhost cannot be used, because it stays reachable with Wi-Fi off, and the word-list check needs HTTPS on any other address.

## Steps

1. On the computer with the repository, run `pnpm preview:lan` and note the address it prints. If the computer's firewall asks, allow incoming connections for the test. On a different device on the same network (a phone or tablet is easiest) that has not opened the site before, open that address while online and accept the certificate warning once; the certificate is self-signed for this test.
2. In **Fetch words**, check that the language selector shows English, then select **Fetch words**. Expected: "English words ready in this tab: 7,776 words."
3. Disconnect as the page describes (Airplane mode, or Wi-Fi off and no cable), and check that another website no longer loads.
4. Tick the confirmation and select **Confirm offline**. Expected: the "Confirming offline" dialog, then "Could not reach Rememberphrase. This does not prove your computer is offline." and **Ready for the next step** with the green band: "You confirmed offline, and the word list is ready in this tab." with the note "Good to know: websites can't see your device's Airplane mode setting, so this relies on your own check." No words appear anywhere.
5. Reconnect. Expected: a red **You may still be connected** alert with **Acknowledge**. After acknowledging, the alert closes, the red hold stays inside **Go offline**, and the confirmation is unticked.
6. Disconnect again, tick the confirmation and confirm. Expected: ready and green again.
7. Reload while online, fetch the words, then tick the confirmation and confirm while still online. Expected: the red alert ("Rememberphrase answered…"); after acknowledging, the hold stays and nothing is ready.
8. With a screen reader on (VoiceOver, NVDA or TalkBack), repeat steps 2–5 using only the keyboard or screen-reader gestures. Expected: every control is reachable and named, the red alert is announced and focus moves to **Acknowledge**, focus then returns to the confirmation, and each status change is announced.

## Record

- Date:
- Device and operating system:
- Browser and version:
- Preview address:
- Notes:
- Result: not yet run

## Earlier runs

- 2026-10-24, iPhone with Safari (versions not recorded), previous flow with visible disposable samples: steps 1–7 passed; the screen-reader step was not done. Superseded by the revised Prepare step.
