// User-facing copy for the Prepare step. Safety wording lives here so tests/unit/copy.test.ts can check it.
export const copy = {
  tagline: 'Random words. Your story. A passphrase you can remember.',
  steps: [
    { name: 'Prepare', hint: 'Get ready' },
    { name: 'Generate', hint: 'Get random words' },
    { name: 'Make it yours', hint: 'Arrange into a phrase' },
    { name: 'Remember', hint: 'Practise and safeguard' },
  ],
  heading: 'Step 1. Get ready',
  intro: 'Fetch the word list while you are online. Then go offline before any real words are made.',

  stages: {
    fetch: 'Fetch words',
    offline: 'Go offline',
  },

  list: {
    languageLabel: 'Language',
    helper: "Load the reviewed word list into this open tab while you're online. No separate file is created.",
    action: 'Fetch words',
    loading: 'Fetching words…',
    retry: 'Fetch words again',
    ready: (language: string, count: string) => `${language} words ready in this tab: ${count} words.`,
    errors: {
      download: 'The word list could not be fetched. Check that you are still online, then fetch again.',
      version: 'The word list does not match the expected version. Check that you are online, then fetch again.',
      malformed: 'The word list arrived damaged. Check that you are online, then fetch again.',
    },
  },

  offline: {
    lead: 'Disconnect this device from every network:',
    platforms: [
      { name: 'Windows', how: 'Select the network icon on the taskbar and turn on Airplane mode.' },
      { name: 'Mac', how: 'Open Control Center and turn off Wi-Fi. Unplug any network cable.' },
      { name: 'iPhone or iPad', how: 'Open Control Center and turn on Airplane mode. Make sure Wi-Fi is off too.' },
      { name: 'Android', how: 'Swipe down from the top and turn on Airplane mode. Make sure Wi-Fi is off too.' },
    ],
    check: 'Then open another website in a new tab. It should not load.',
    confirmLabel: "I've disconnected this device from every network.",
    confirm: 'Confirm offline',
    noAnswer: 'Could not reach Rememberphrase. This does not prove your computer is offline.',
    skipped: 'You skipped the connection check.',
  },

  dialog: {
    title: 'Confirming offline',
    note: 'We are trying to reach Rememberphrase. If we cannot, that does not prove your computer is offline.',
    skip: "Skip, I'm offline",
  },

  interruption: {
    title: 'You may still be connected',
    next: 'Check your device, tick the confirmation again and run a new check.',
    acknowledge: 'Acknowledge',
  },

  ready: {
    title: 'Ready for the next step',
    body: 'This tab has the word list and has shown it can make random words without using the network. Generating your real words is the next step, which is not built yet.',
  },

  band: {
    labels: { red: 'Hold', notReady: 'Not ready', caution: 'Caution', green: 'Ready' },
    'site-answered': 'Rememberphrase answered, so you are still connected. Generation is held; check Airplane mode and confirm again.',
    'network-answered':
      'A network answered (this can be a Wi-Fi login page). You may still be connected. Generation is held; check Airplane mode and confirm again.',
    reconnected: 'Your browser reported a connection. Generation is paused; check Airplane mode and confirm again.',
    list: 'Fetch the word list while you are still online.',
    rng: "This browser can't produce the random numbers Rememberphrase needs. Open Rememberphrase over https:// in an up-to-date browser.",
    unconfirmed: 'Offline status not confirmed. Go offline, then confirm.',
    'local-check': 'Checking that this tab can make words…',
    skipped: 'You skipped the connection check. You confirmed offline, and the word list is ready in this tab.',
    'browser-online': 'Your browser still reports a network connection. This can be a VPN or virtual adapter; check Airplane mode.',
    green: 'You confirmed offline, and the word list is ready in this tab.',
    greenNote: "Good to know: websites can't see your device's Airplane mode setting, so this relies on your own check.",
  },

  chip: {
    red: 'Connection may be active',
    notReady: 'Offline not confirmed',
    skipped: 'Check skipped',
    'browser-online': 'Browser reports online',
    green: 'You confirmed offline',
  },

  panel: {
    fetch: {
      title: 'About the word list',
      body: [
        'Your words come from the EFF Long Wordlist: 7,776 common English words, chosen to be easy to type and remember.',
        'The list is loaded into this tab now, while you are online, so nothing needs to be downloaded later.',
      ],
    },
    offline: {
      title: 'Why go offline?',
      body: [
        'Keep this tab open. If you close or reload it, you will need to go online and start again.',
        'Your real words are made in this tab, on this device, and this page never sends them anywhere. Going offline first is an extra check you control.',
        'The page cannot tell for certain whether your device is offline. It relies on you, plus one short check that tries to reach Rememberphrase.',
      ],
    },
    ready: {
      title: 'What this means',
      body: [
        'After your check, this tab quietly made a few random words and threw them away, to make sure it can make words without the network. Nobody sees them.',
        'It does not prove your device is offline. That part is your own check.',
      ],
    },
    noStorage:
      'This site stores nothing in your browser: no cookies and no saved data. Your browser or device may still keep its own records, such as history.',
    attribution: 'Word list: EFF Long Wordlist by the Electronic Frontier Foundation, CC BY 4.0.',
  },
};
