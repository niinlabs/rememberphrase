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
    retryCheck: 'Try the check again',
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
    continue: 'Continue to Generate',
  },

  generate: {
    heading: 'Step 2. Generate random words',
    intro: 'Choose how many words, then generate. Lock the ones you like and reroll the rest.',
    countLabel: 'Number of words',
    fewer: 'Fewer words',
    more: 'More words',
    guidance: {
      tooFew: 'Too few random words for an important password.',
      short: 'Shorter than we recommend for a master password or computer login.',
      recommended: 'The length we recommend for a master password or computer login.',
    },
    wordsLabel: 'Your random words',
    generate: 'Generate random words',
    newWords: 'Generate new words',
    reroll: (n: number) => `Reroll unlocked words (${n})`,
    allLocked: 'Unlock a word to reroll.',
    unlockAll: 'Unlock all',
    lock: (word: string) => `Lock ${word}`,
    lockedTag: 'Locked',
    unlocksNeeded: (n: number, count: number) => `Unlock ${n} ${n === 1 ? 'word' : 'words'} to go down to ${count} words.`,
    duplicate: 'This word appears twice. You can reroll it if you like.',
    back: 'Back to Prepare',
    continue: 'Make it yours',
  },

  compose: {
    heading: 'Step 3. Make it yours',
    intro: 'Move, join or edit your words, and add connecting words if they help you picture a sentence.',
    tilesLabel: 'Your phrase, word by word',
    moveHelp: 'Drag to move, or select and choose where to put it. With the keyboard, use the arrow keys.',
    handle: (text: string) => `Move ${text}`,
    moved: (text: string, position: number, total: number) => `${text} moved to position ${position} of ${total}.`,
    moveHere: (position: number) => `Move here, position ${position}`,
    insertHere: (text: string, position: number) => `Insert ${text} here, position ${position}`,
    cancelPlacing: 'Cancel',
    placingWord: (text: string) => `Choose where to move ${text}.`,
    placingConnector: (text: string) => `Choose where to insert ${text}.`,
    wordLabel: (position: number) => `Word ${position}`,
    origin: {
      unchanged: 'Random word',
      combined: 'Two random words',
      edited: 'Edited',
      rewritten: 'Your own word',
      connector: 'Connecting word',
    },
    join: 'Join with next',
    split: 'Split',
    remove: (text: string) => `Remove ${text}`,
    lockedNote: 'Locked',
    wordErrors: {
      empty: "A word can't be empty.",
      'too-long': 'Use 32 characters or fewer.',
      control: "Line breaks and tabs can't be used.",
      'edge-space': 'Remove the space at the start or end.',
    },
    connectorsTitle: 'Connecting words',
    connectorsHelp: 'Drag one between your words, or select one and choose where it goes. They are not random words and are not counted.',
    separatorLegend: 'Between words',
    separators: { space: 'Space', hyphen: 'Hyphen ( - )', period: 'Period ( . )', underscore: 'Underscore ( _ )' },
    previewLabel: 'Your phrase as you will type it',
    counts: (intact: number, drawn: number, connectors: number, chars: number) =>
      `${intact} of ${drawn} random words unchanged · ${connectors} connecting ${connectors === 1 ? 'word' : 'words'} · ${chars} characters`,
    editedNote: 'Edited or replaced words no longer count as random words.',
    keyboardNote: 'Your phrase has characters that can be hard to type on some keyboards or start-up screens.',
    reset: 'Reset my changes',
    startFresh: 'Start fresh',
    back: 'Back to Generate',
    nextStep: 'Practising your phrase is the next step, which is not built yet.',
  },

  warn: {
    discardTitle: 'Replace your arranged phrase?',
    discardBody: 'New words replace the phrase you arranged in Make it yours, including your edits and connecting words.',
    discardConfirm: 'Replace it',
    freshTitle: 'Start fresh?',
    freshBody: 'This throws away your current words and changes and draws a completely new set.',
    freshConfirm: 'Start fresh',
    cancel: 'Keep my phrase',
  },

  band: {
    labels: { red: 'Hold', notReady: 'Not ready', caution: 'Caution', green: 'Ready' },
    details: 'Details',
    'site-answered': 'Rememberphrase answered, so you are still connected. Generation is held; check Airplane mode and confirm again.',
    'network-answered':
      'A network answered (this can be a Wi-Fi login page). You may still be connected. Generation is held; check Airplane mode and confirm again.',
    reconnected: 'Your browser reported a connection. Generation is paused; check Airplane mode and confirm again.',
    list: 'Fetch the word list while you are still online.',
    rng: "This browser can't produce the random numbers Rememberphrase needs, so preparation can't continue here. Open Rememberphrase over https:// in an up-to-date browser.",
    unconfirmed: 'Offline status not confirmed. Go offline, then confirm.',
    'local-check': 'Checking that this tab can make words…',
    'local-check-failed':
      "This tab couldn't make random words just now, so making words is held. Try the check again. If it keeps failing, reload the page while online.",
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
        'Fetch words loads the list into this tab while you are online, so nothing needs to be downloaded once you go offline.',
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
    generate: {
      title: 'About these words',
      body: [
        'Each word is drawn at random from 7,776 words, independently, here in this tab.',
        "Locking keeps a word through rerolls. Choosing which words to keep doesn't add strength, but it can make the phrase easier to remember.",
        "This page doesn't send or store your words. Keep this tab open until you have learned your phrase.",
      ],
    },
    compose: {
      title: 'About your phrase',
      body: [
        "Moving, joining and connecting words can make the phrase easier to remember. They don't add strength.",
        'An edited or replaced word no longer counts as a random word. Reset my changes brings the generated words back.',
        'The "Your phrase as you will type it" box shows exactly what you will type, including capitals, symbols and what sits between words.',
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
