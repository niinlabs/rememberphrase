// D9: the login requirements the user states, checked locally against the exact phrase. Only stated
// rules are reported, and a met rule means only that this page's check passed, not that a service
// will accept the phrase.

export type Rules = {
  minLength: number | null;
  maxLength: number | null;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  symbol: boolean;
  noSpaces: boolean;
  plainKeyboard: boolean; // typed at a start-up screen or on another keyboard layout
};
export type RuleId = keyof Rules;

export const NO_RULES: Rules = {
  minLength: null,
  maxLength: null,
  upper: false,
  lower: false,
  digit: false,
  symbol: false,
  noSpaces: false,
  plainKeyboard: false,
};

const length = (text: string) => [...text].length; // characters as the preview counts them

const tests: Record<RuleId, (text: string, rules: Rules) => boolean> = {
  minLength: (text, r) => length(text) >= r.minLength!,
  maxLength: (text, r) => length(text) <= r.maxLength!,
  upper: (text) => /\p{Lu}/u.test(text),
  lower: (text) => /\p{Ll}/u.test(text),
  digit: (text) => /[0-9]/.test(text),
  symbol: (text) => /[^\p{L}\p{N}\s]/u.test(text),
  noSpaces: (text) => !/\s/u.test(text),
  plainKeyboard: (text) => /^[\x21-\x7e ]*$/.test(text),
};

const stated = (rules: Rules, id: RuleId) => rules[id] !== null && rules[id] !== false;

export function checkRules(text: string, rules: Rules): { id: RuleId; met: boolean }[] {
  return (Object.keys(tests) as RuleId[]).filter((id) => stated(rules, id)).map((id) => ({ id, met: tests[id](text, rules) }));
}
