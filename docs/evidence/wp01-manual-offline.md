# WP01 manual offline exercise

The browser tests emulate going offline. This record covers the real thing: a real device, a real network switch-off and the built site served over HTTPS. Localhost cannot be used, because it stays reachable with Wi-Fi off, and the word-list check needs HTTPS on any other address.

## Steps

1. On a device that has not opened the site before, open the HTTPS preview in a normal browser window while online.
2. Select **Prepare my words**. Expected: "Word list ready in this tab: 7,776 words."
3. Disconnect as the page describes (Airplane mode, or Wi-Fi off and no cable), and check that another website no longer loads.
4. Tick the confirmation and select **Confirm offline**. Expected: the "Confirming offline" dialog, then "Could not reach Rememberphrase. This does not prove your computer is offline."
5. Select **Try a disposable sample** twice. Expected: two different samples, and the band turns green: "You confirmed offline; word list ready in this tab. The site cannot verify Airplane mode."
6. Reconnect. Expected: the band turns red: "Your browser reported a connection…"
7. Reload, repeat steps 2 and 4 while still online. Expected: red, "Rememberphrase answered…", and no sample button.
8. With a screen reader on (VoiceOver, NVDA or TalkBack), repeat steps 2–5 using only the keyboard or screen-reader gestures. Expected: every control is reachable and named, and each status change is announced.

## Record

- Date:
- Device and operating system:
- Browser and version:
- Preview address:
- Notes:
- Result: not yet run
