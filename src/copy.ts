// User-facing copy for the Prepare step. Safety wording lives here so tests/unit/copy.test.ts can check it.
export const copy = {
  tagline: 'Random start. Your story. A passphrase you can remember.',
  steps: [
    { name: 'Prepare', hint: 'Get ready' },
    { name: 'Generate', hint: 'Get random words' },
    { name: 'Make it yours', hint: 'Arrange into a phrase' },
    { name: 'Remember', hint: 'Practise and safeguard' },
  ],
  // WP04: the unnumbered introduction. The examples are fixed public text, hand-picked from the list and
  // arranged with approved connecting words: illustrations, never a draw, so they make no strength claim.
  landing: {
    heading: 'Make a passphrase you can remember',
    intro: [
      "Rememberphrase helps you turn random words into a phrase you can picture and type. It is for one of the few passwords you need to remember, such as your password manager's master password or your computer login.",
      'It is not a password manager, and it does not store your phrase.',
    ],
    examplesTitle: 'For example',
    wordsLabel: 'Words from the list',
    storyLabel: 'Arranged into a picture',
    examples: [
      {
        words: ['drizzle', 'cactus', 'lantern', 'velvet', 'raft', 'pancake'],
        story: 'velvet cactus on a raft with the lantern in pancake drizzle',
      },
      {
        words: ['snowman', 'banjo', 'igloo', 'mustard', 'walrus', 'rocket'],
        story: 'snowman with a banjo in the igloo near mustard walrus rocket',
      },
    ],
    editTitle: 'What happens if I change the words?',
    edit: [
      'The strength comes from the random words. Each is drawn from 7,776 words, so even someone who knows exactly how Rememberphrase works has to guess every one.',
      "Moving words, joining them or adding small connecting words doesn't take that away, but it doesn't necessarily add to it either.",
      'Replacing a word, removing letters from it or removing it makes your phrase less random. Capitals, look-alike swaps like 3 for e and added characters keep a word random. With fewer random words left, the phrase may be easier to guess.',
    ],
    examplesOnly: 'Examples only. Do not use these as passwords.',
    examplesNote:
      'These words were picked by hand to show the idea. Your own words are drawn at random in your tab, and only those count toward strength. The small words in between, like "with" and "the", are always your own choice.',
    nextTitle: 'What happens next',
    next: [
      'Fetch the word list while you are online.',
      'Go offline, then make your own random words in this tab.',
      'Arrange them into your phrase, practise it and keep a recovery copy.',
    ],
    tabNote: 'Keep this tab open from start to finish. Nothing is saved, so closing or reloading it starts over.',
    start: 'Start making a passphrase',
  },

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
    continueLink: "I can't disconnect – continue while connected",
    continued: 'You chose to continue while connected.',
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
    lock: (position: number, word: string) => `Lock word ${position}, ${word}`, // positions tell duplicate words apart (D12)
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
      combined: 'Joined random words',
      edited: 'Edited',
      rewritten: 'Your own word',
      connector: 'Connecting word',
      own: 'Added by you',
    },
    join: 'Join with next',
    split: 'Split',
    remove: (text: string) => `Remove ${text}`,
    wordErrors: {
      empty: "A word can't be empty.",
      'too-long': 'Use 32 characters or fewer.',
      control: "Line breaks and tabs can't be used.",
      'edge-space': 'Remove the space at the start or end.',
    },
    connectorsTitle: 'Connecting words',
    connectorsHelp: 'Drag one between your words, or select one and choose where it goes. They are never counted as random words.',
    ownLabel: 'Your own word',
    ownAdd: 'Add',
    ownHelp: 'Anything you like: a word, digits or a symbol. It goes at the end of your phrase. Move it like any other word. Avoid anything others could link to you, such as names, birthdays or places.',
    ownAdded: (text: string) => `${text} added at the end.`,
    separatorLegend: 'Between words',
    separators: { space: 'Space', hyphen: 'Hyphen ( - )', period: 'Period ( . )', underscore: 'Underscore ( _ )', none: 'Nothing' },
    previewLabel: 'Your chosen phrase',
    typeAdded: 'Include connecting words in the phrase',
    typeAddedHelp: "These words help you remember the order and you don't need to include them when typing your phrase.",
    storyLabel: 'With connecting words',
    // D8 as amended 2026-11-18, shown under the phrase in Make it yours: one dot per draw, one count,
    // the D4 guidance, and the reason and rules behind What counts?
    randomTitle: 'Random words',
    strengthCount: (intact: number, drawn: number) =>
      intact === drawn ? `${drawn} random ${drawn === 1 ? 'word' : 'words'}` : `${intact} of ${drawn} words still random`,
    strengthWhy: (list: string) =>
      `Your phrase gets its strength from the random words. Each one is picked from ${list} words, so every extra random word makes the phrase much stronger.`,
    strengthNone: 'We cannot estimate the strength of words you wrote yourself.',
    countsTitle: 'What counts?',
    counts: [
      'Counts: random words, also with capitals, look-alike swaps like 3 for e, or characters added before or after.',
      "Doesn't count: words you replaced or removed letters from, connecting words and your own words.",
      "Doesn't add strength: moving, joining or locking words, separators, or the Capitalise, Add a number and Add a symbol options.",
    ],
    keyboardNote: 'Your phrase has characters that can be hard to type on some keyboards or start-up screens.',
    reset: 'Reset my changes',
    startFresh: 'Start fresh',
    back: 'Back to Generate',
    continue: 'Continue to Remember',
  },

  // D9: only what the user states is checked, and a passed check is never presented as acceptance.
  requirements: {
    title: 'External password requirements',
    notSpecified: 'Requirements not specified',
    summary: (met: number, total: number) => `${met} of ${total} ${total === 1 ? 'rule' : 'rules'} met`,
    intro: 'Optional. Enter only what the service or computer asks for, and this page checks your phrase against it.',
    minLength: 'At least this many characters',
    maxLength: 'At most this many characters',
    options: {
      upper: 'Needs an uppercase letter',
      lower: 'Needs a lowercase letter',
      digit: 'Needs a digit',
      symbol: 'Needs a symbol',
      noSpaces: "Spaces aren't allowed",
      plainKeyboard: "I'll type it at a start-up screen or on another keyboard layout",
    },
    checklistTitle: 'Checked against the rules you entered',
    rule: {
      minLength: (n: number) => `At least ${n} characters`,
      maxLength: (n: number) => `At most ${n} characters`,
      upper: 'An uppercase letter',
      lower: 'A lowercase letter',
      digit: 'A digit',
      symbol: 'A symbol',
      noSpaces: 'No spaces',
      plainKeyboard: 'No accented or special characters',
    },
    met: 'Met',
    notMet: 'Not met',
    fix: {
      minLength: 'Add a word in Generate, or include connecting words in the phrase.',
      maxLength: 'Use fewer or shorter words.',
      upper: 'Use Capitalise below.',
      lower: 'Edit a word to include a lowercase letter.',
      digit: 'Use Add a number below.',
      symbol: 'Use Add a symbol below, or put a hyphen, period or underscore between words.',
      noSpaces: 'Choose another option under Between words.',
      plainKeyboard: 'Edit words to remove accented letters or other special characters.',
    },
    otherRules: 'A service may have other rules. Try your phrase there.',
    fitTitle: 'Make it fit',
    capitaliseLegend: 'Capitalise',
    capitalise: { none: 'No', first: 'First word', every: 'Every word' },
    digitLabel: 'Add a number at the end',
    symbolLabel: 'Add a symbol at the end',
    none: 'None',
    fitNote:
      "Changes here don't necessarily make a passphrase stronger. Other changes, like @ for a, can be made directly in the words below.",
  },

  remember: {
    heading: 'Step 4. Remember your phrase',
    intro: 'Learn your phrase, practise typing it if you like, and make a recovery copy before you close this tab.',
    tipsTitle: 'Make it stick',
    stick: 'Picture your words as one scene in their final order, then practise below until you can type it without looking.',
    ideasTitle: 'Memory ideas',
    tips: [
      'Picture a scene with your words in their final order. The stranger the scene, the easier it is to recall.',
      'Say it in a rhythm, or split it into two or three groups of words.',
      'Recall it again in a few hours and tomorrow, before you rely on it.',
    ],
    practiceTitle: 'Practise typing it',
    practiceIntro: 'Choose how much help you want, then type your phrase. It is checked as you type. What you type stays in this tab and is not sent or saved.',
    // D13 as amended 2026-11-18: one aid at a time, No aid by default; connecting words add to an aid.
    aidLegend: 'Help while you type',
    aids: { follow: 'Follow along', reveal: 'Reveal as you type', none: 'No aid' },
    aidHelp: {
      follow: 'Your phrase is shown faintly and lights up as you type it correctly. A mistake stops it.',
      reveal: 'Each character appears once you have typed it correctly. A mistake stops it.',
      none: 'Type from memory. Nothing of your phrase is shown.',
    },
    showConnectors: 'Show connecting words',
    hidden: (chars: number) => `${chars} hidden ${chars === 1 ? 'character' : 'characters'}`,
    notTyped: 'not typed:',
    showPhrase: 'Reveal whole phrase',
    hidePhrase: 'Hide whole phrase',
    attemptLabel: 'Type your phrase',
    showEntry: 'Show entry',
    hideEntry: 'Hide entry',
    live: { wrong: 'Wrong passphrase', short: 'Too short, keep going', long: 'Too long' },
    clearEntry: 'Clear entry',
    match: 'That matches your phrase exactly.',
    mismatch: "That doesn't match yet. Check capitals, spaces and what sits between words.",
    retry: 'Next attempt',
    practiceLimits: "Your browser, its extensions and anyone who can see your screen are outside this page's control.",
    moreTitle: 'Want to know more?',
    managersTitle: 'Password managers',
    managers: [
      'A password manager makes and remembers a different password for each of your other accounts, so a phrase like this can be one of the few you keep in your head.',
      "Protect the manager with a phrase like this one, and set up its recovery or emergency kit.",
      'Rememberphrase is not a password manager and does not keep your phrase.',
    ],
    twoFactorTitle: 'Two-factor authentication (2FA)',
    twoFactor: [
      'Two-factor authentication asks for something more than your password, such as a code from an app or a security key.',
      'Turn it on for important accounts, such as your email and your password manager, so a password alone is not enough to get in.',
      'Keep its backup codes on paper too, stored like your recovery copy.',
    ],
    rulesUnmet: (n: number) => `Your phrase doesn't meet ${n} of the login rules you entered.`,
    fixRules: 'Fix in Make it yours',
    recoveryTitle: 'Keep a recovery copy',
    recovery: [
      'Write the phrase on paper and keep it away from this device, for example with your important documents.',
      'Never keep it as a photo, a cloud note, a chat message or a file.',
      "If this is a password manager's master password, also set up the manager's own recovery or emergency kit.",
      "Then try it where you will use it. Practising here can't tell you whether a service will accept it.",
    ],
    clearHelp: 'When you have a recovery copy, clear the phrase from this page.',
    clear: 'Clear phrase',
    back: 'Back to Make it yours',
    cleared: 'Your phrase is cleared from this page. Your browser or device may still keep its own records.',
    clearedTipsTitle: 'To remove what your browser may keep',
    clearedTips: [
      'Close this tab, or the whole window if you used a private window.',
      'If your browser or password manager offered to save what you typed, open its saved passwords and delete that entry.',
      "Delete this site from your browsing history if you don't want a record that you visited.",
      'On a phone, the keyboard may have learned the words you typed. You can reset its dictionary in the keyboard settings.',
    ],
    another: 'Make another phrase',
  },

  warn: {
    discardTitle: 'Replace your arranged phrase?',
    discardBody: 'New words replace the phrase you arranged in Make it yours, including your edits and connecting words.',
    discardConfirm: 'Replace it',
    freshTitle: 'Start fresh?',
    freshBody: 'This throws away your current words and changes and draws a completely new set.',
    freshConfirm: 'Start fresh',
    clearTitle: 'Clear your phrase?',
    clearBody: "Make sure you have a recovery copy or know it by heart. Once it's cleared, this page can't show it again.",
    clearConfirm: 'Clear phrase',
    connectedTitle: 'Continue while connected?',
    connectedBody:
      "Your words are still made only in this tab, and this page doesn't send them. But while you're connected, a tampered page or a browser extension could. If this is for something important, try again on a network you can switch off.",
    connectedConfirm: 'Continue while connected',
    connectedCancel: 'Go back and disconnect',
    homeTitle: 'Start over?',
    homeBody: 'Going back to the start clears your phrase from this page. The word list stays loaded, so you can make a new phrase without going online again.',
    homeConfirm: 'Start over',
    removeTitle: (text: string) => `Remove ${text}?`,
    removeBody: 'It leaves your phrase, so it no longer counts toward strength. Reset my changes brings it back.',
    removeConfirm: 'Remove',
    cancel: 'Keep my phrase',
  },

  band: {
    labels: { red: 'Hold', continued: 'Connected', notReady: 'Not ready', caution: 'Caution', green: 'Ready' },
    details: 'Details',
    'site-answered': "Rememberphrase answered, so you are still connected. Generation is held; check that you're disconnected and confirm again.",
    'network-answered':
      "A network answered (this can be a Wi-Fi login page). You may still be connected. Generation is held; check that you're disconnected and confirm again.",
    reconnected: "Your browser reported a connection. Generation is paused; check that you're disconnected and confirm again.",
    list: 'Fetch the word list while you are still online.',
    rng: "This browser can't produce the random numbers Rememberphrase needs, so preparation can't continue here. Open Rememberphrase over https:// in an up-to-date browser.",
    unconfirmed: 'Offline status not confirmed. Go offline, then confirm.',
    'local-check': 'Checking that this tab can make words…',
    'local-check-failed':
      "This tab couldn't make random words just now, so making words is held. Try the check again. If it keeps failing, reload the page while online.",
    skipped: 'You skipped the connection check. You confirmed offline, and the word list is ready in this tab.',
    continued:
      "You chose to continue while connected. Your words are still made only in this tab, and this page doesn't send them, but while you're connected a tampered page or a browser extension could.",
    'browser-online': "Your browser still reports a network connection. This can be a VPN or virtual adapter; check that you're disconnected.",
    green: 'You confirmed offline, and the word list is ready in this tab.',
    greenNote: "Good to know: websites can't see your device's Airplane mode setting, so this relies on your own check.",
  },

  chip: {
    red: 'Connection may be active',
    notReady: 'Offline not confirmed',
    skipped: 'Check skipped',
    continued: 'You chose to continue while connected',
    'browser-online': 'Browser reports online',
    green: 'You confirmed offline',
  },

  home: 'back to the start',

  footer: {
    sponsored: 'Sponsored by',
    sponsor: 'Shift Everywhere',
    developed: 'Developed by',
    developer: 'Niinlabs',
    newTab: '(opens in a new tab)',
    licence: 'Rememberphrase is open source under the Apache License 2.0. Word list: EFF Long Wordlist, CC BY 4.0.',
  },

  panel: {
    landing: {
      title: 'Before you start',
      body: [
        'Your words are made here in this browser tab, on your device. This page never sends them anywhere.',
        'Partway through you will disconnect from every network, so set aside a few quiet minutes.',
      ],
    },
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
        'The page cannot tell for certain whether your device is offline. It relies on you, plus one small test that tries to reach rememberphrase.com.',
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
        "Moving, joining and connecting words can make the phrase easier to remember. They don't necessarily add strength.",
        'A replaced word, or one with letters removed, no longer counts as a random word. Capitals, look-alike swaps and added characters are fine. Reset my changes brings the generated words back.',
        'The "Your chosen phrase" box shows exactly what you will type, including capitals, symbols and what sits between words.',
      ],
    },
    remember: {
      title: 'About practising',
      body: [
        'The check compares what you type with your phrase exactly, here in this tab. Nothing is sent or saved.',
        'Practice is optional, and you can try as much as you like before using the phrase for real.',
        'Keep this tab open until you have noted down a recovery copy. Closing or reloading it loses the phrase.',
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
    attribution: { before: 'Word list: EFF Long Wordlist by the ', link: 'Electronic Frontier Foundation', after: ', CC BY 4.0.' },
  },
};

// D4: the guidance level follows the number of intact random words (D8).
// The most intact words at each level below recommended; the Step 3 dot lines sit right after them.
export const GUIDANCE_LIMITS = { tooFew: 3, short: 5 } as const;
export const guidanceFor = (intact: number) =>
  intact <= GUIDANCE_LIMITS.tooFew
    ? copy.generate.guidance.tooFew
    : intact <= GUIDANCE_LIMITS.short
      ? copy.generate.guidance.short
      : copy.generate.guidance.recommended;
