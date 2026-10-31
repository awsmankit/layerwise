/**
 * "Okay or not okay?" for AI and schoolwork. The same action can be fine under
 * one teacher's rule and not fine under another's, so the verdict is looked up
 * from the rule the learner picks. All rules and scenarios are made-up examples.
 */
export type Rule = 'none' | 'buddy' | 'open' | 'unsaid';
export type Verdict = 'ok' | 'ask' | 'not';

export const RULES: { id: Rule; label: string; text: string }[] = [
  { id: 'none', label: 'No AI', text: 'No AI for this homework. Studying for a test is up to you.' },
  { id: 'buddy', label: 'Study buddy', text: 'AI may explain, quiz and check. You write every answer, and you say you used it.' },
  { id: 'open', label: 'Open, with a note', text: 'AI may help you plan and draft. You edit it, check the facts and add a note saying how you used it.' },
  { id: 'unsaid', label: 'Not said yet', text: 'Your teacher has not said anything about AI.' },
];

export const VERDICT_LABEL: Record<Verdict, string> = {
  ok: 'Okay',
  ask: 'Ask first',
  not: 'Not okay',
};

export type Scenario = {
  id: string;
  text: string;
  /** The right answer under each rule, with a short reason and what to do instead. */
  by: Record<Rule, { verdict: Verdict; why: string }>;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'explain',
    text: 'You do not get a homework question. You ask AI to explain the idea in simpler words, then write your own answer.',
    by: {
      none: { verdict: 'ask', why: 'The rule covers the homework itself. Asking for an explanation is a grey area, so check with your teacher.' },
      buddy: { verdict: 'ok', why: 'Explaining is what a study buddy is for. You still write the answer yourself.' },
      open: { verdict: 'ok', why: 'Explaining is allowed. Remember the note about how you used it.' },
      unsaid: { verdict: 'ask', why: 'No rule yet, so ask. A one-line question to your teacher settles it.' },
    },
  },
  {
    id: 'quiz',
    text: 'The night before a spelling test, you ask AI to quiz you on the word list.',
    by: {
      none: { verdict: 'ok', why: 'Studying for a test is up to you under this rule. Check the answers against your word list.' },
      buddy: { verdict: 'ok', why: 'Quizzing is the best way to use a study buddy. Trying to remember helps you learn.' },
      open: { verdict: 'ok', why: 'Quizzing yourself is fine, and it helps you learn.' },
      unsaid: { verdict: 'ask', why: 'It is probably fine, but you have no rule to point to. Ask once and you will know for next time.' },
    },
  },
  {
    id: 'spelling',
    text: 'You write a paragraph yourself, paste it in, and ask AI to point out spelling mistakes. You fix them yourself.',
    by: {
      none: { verdict: 'not', why: 'The rule says no AI on this homework, and this uses AI on it. A dictionary or a friend is fine instead.' },
      buddy: { verdict: 'ok', why: 'Checking is allowed, and you wrote the paragraph. Say that you used it.' },
      open: { verdict: 'ok', why: 'Allowed. Add your note, for example: AI checked my spelling.' },
      unsaid: { verdict: 'ask', why: 'No rule yet. Ask before you use AI on work you hand in.' },
    },
  },
  {
    id: 'plan',
    text: 'You ask AI for a list of headings for your history project, then fill them in yourself.',
    by: {
      none: { verdict: 'not', why: 'Planning is part of the homework, and the rule says no AI on it.' },
      buddy: { verdict: 'ask', why: 'A study buddy explains, quizzes and checks. Planning is a step further, so ask first.' },
      open: { verdict: 'ok', why: 'Planning help is allowed. Make the plan your own, and add your note.' },
      unsaid: { verdict: 'ask', why: 'No rule yet. Planning is a grey area, so ask.' },
    },
  },
  {
    id: 'draft',
    text: 'You let AI write a first draft of your story. You edit it and write at the top: I used AI for a first draft.',
    by: {
      none: { verdict: 'not', why: 'No AI is allowed on this homework, even if you say so.' },
      buddy: { verdict: 'not', why: 'Here you write every answer yourself. A draft from AI is the part you are meant to do.' },
      open: { verdict: 'ok', why: 'Drafting help is allowed, and you edited it and said so. That is the whole rule.' },
      unsaid: { verdict: 'ask', why: 'Saying you used it is good, but without a rule you cannot be sure it is allowed. Ask first.' },
    },
  },
  {
    id: 'facts',
    text: 'AI gives you five facts for your project. You check each one in your textbook before you use it.',
    by: {
      none: { verdict: 'not', why: 'The rule says no AI on this homework. Start from your textbook instead.' },
      buddy: { verdict: 'ask', why: 'Finding facts is not explaining or quizzing, so ask. Checking them in a book is the right habit either way.' },
      open: { verdict: 'ok', why: 'Allowed, and checking is the key step. AI can make facts up.' },
      unsaid: { verdict: 'ask', why: 'No rule yet. Ask, and keep checking facts in a book either way.' },
    },
  },
  {
    id: 'whole',
    text: 'You ask AI to write your whole book report, and you hand it in as your own work.',
    by: {
      none: { verdict: 'not', why: 'Handing in work you did not do is not okay under any rule. It skips the learning.' },
      buddy: { verdict: 'not', why: 'Handing in work you did not do is not okay under any rule. It skips the learning.' },
      open: { verdict: 'not', why: 'Even this rule needs you to edit, check and add a note. A whole report handed in as yours is still not okay.' },
      unsaid: { verdict: 'not', why: 'Handing in work you did not do is not okay under any rule. It skips the learning.' },
    },
  },
  {
    id: 'silent',
    text: 'You use AI for help with your homework and say nothing about it.',
    by: {
      none: { verdict: 'not', why: 'No AI is allowed on this homework, and keeping it quiet makes it worse.' },
      buddy: { verdict: 'not', why: 'This rule asks you to say you used it. Keeping quiet breaks the rule.' },
      open: { verdict: 'not', why: 'This rule asks for a note about how you used it. Without the note it is not okay.' },
      unsaid: { verdict: 'ask', why: 'If you are unsure, say so and ask. Being open is always safer than keeping quiet.' },
    },
  },
];

export function verdictFor(scenario: Scenario, rule: Rule): { verdict: Verdict; why: string } {
  return scenario.by[rule];
}

export function isCorrect(scenario: Scenario, rule: Rule, picked: Verdict): boolean {
  return scenario.by[rule].verdict === picked;
}

/** Scenarios whose right answer differs between at least two rules. */
export function ruleDependent(): Scenario[] {
  return SCENARIOS.filter((s) => new Set(RULES.map((r) => s.by[r.id].verdict)).size > 1);
}

export function score(picks: Record<string, Verdict>, rule: Rule): { answered: number; correct: number } {
  let answered = 0;
  let correct = 0;
  for (const s of SCENARIOS) {
    const p = picks[s.id];
    if (!p) continue;
    answered++;
    if (isCorrect(s, rule, p)) correct++;
  }
  return { answered, correct };
}
