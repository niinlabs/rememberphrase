// User-facing copy for the Prepare step. Safety wording lives here so tests/unit/copy.test.ts can check it.
export const copy = {
  tagline: 'Random words. Your story. A passphrase you can remember.',
  steps: [
    { name: 'Prepare', hint: 'Get ready' },
    { name: 'Generate', hint: 'Get random words' },
    { name: 'Make it yours', hint: 'Arrange into a phrase' },
    { name: 'Remember', hint: 'Practise and safeguard' },
  ],
  languageLabel: 'Language',
  heading: 'Step 1. Get ready',
  intro: 'Load the word list while you are online. Then go offline before any real words are made.',

  stages: {
    language: 'Load the word list',
    offline: 'Go offline',
    sample: 'Try a disposable sample',
  },

  list: {
    action: 'Prepare my words',
    loading: 'Loading the word list…',
    retry: 'Try again',
    ready: (count: string) => `Word list ready in this tab: ${count} words.`,
    errors: {
      download: 'The word list could not be downloaded. Check that you are still online, then try again.',
      version: 'The word list does not match the expected version. Reload the page while online and try again.',
      malformed: 'The word list is damaged. Reload the page while online and try again.',
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

  sample: {
    action: 'Try a disposable sample',
    again: 'Try another sample',
    label: (n: number) => `Disposable sample ${n}`,
    tag: 'Sample, do not use',
    rngError: "This browser can't produce the random numbers Rememberphrase needs, so no words can be made.",
    nextStep: 'This tab is ready. Generating your real words is the next step, which is not built yet.',
  },

  band: {
    labels: { red: 'Hold', notReady: 'Not ready', caution: 'Caution', green: 'Ready' },
    'site-answered': 'Rememberphrase answered, so you are still connected. Generation is held; check Airplane mode and confirm again.',
    'network-answered':
      'A network answered (this can be a Wi-Fi login page). You may still be connected. Generation is held; check Airplane mode and confirm again.',
    reconnected: 'Your browser reported a connection. Generation is paused; check Airplane mode and confirm again.',
    list: 'Load the word list while you are still online.',
    rng: "This browser can't produce the random numbers needed, so no words can be made.",
    unconfirmed: 'Offline status not confirmed. Go offline, then confirm.',
    sample: 'Offline status not confirmed. Try a disposable sample.',
    skipped: 'You skipped the connection check. You confirmed offline; word list ready in this tab.',
    'browser-online': 'Your browser still reports a network connection. This can be a VPN or virtual adapter; check Airplane mode.',
    green: 'You confirmed offline; word list ready in this tab. The site cannot verify Airplane mode.',
  },

  chip: {
    red: 'Connection may be active',
    notReady: 'Offline not confirmed',
    skipped: 'Check skipped',
    'browser-online': 'Browser reports online',
    green: 'You confirmed offline',
  },

  panel: {
    language: {
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
    sample: {
      title: 'Why a sample?',
      body: [
        'A sample shows that words can be made while the network is off.',
        'Sample words are thrown away. Never use them as a password.',
      ],
    },
    noStorage: 'Nothing you do here is saved, not even in your browser.',
    attribution: 'Word list: EFF Long Wordlist by the Electronic Frontier Foundation, CC BY 4.0.',
  },
};
