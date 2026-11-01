/*
 * Logic for the "model card builder" in the AI governance lesson. The example model, its facts and
 * every number are invented. The nine sections follow Mitchell and others, "Model Cards for Model
 * Reporting" (2018). A reader's checklist, not a standard.
 */

export type SectionId =
  | 'details'
  | 'intended'
  | 'factors'
  | 'metrics'
  | 'evaldata'
  | 'traindata'
  | 'analyses'
  | 'ethics'
  | 'caveats';

export type StatementKind = 'solid' | 'vague' | 'unsupported';

export interface Statement {
  id: string;
  text: string;
  kind: StatementKind;
  /** a solid statement that the section needs before it counts as complete */
  required?: boolean;
  /** short name shown when a required statement is missing */
  short?: string;
  /** shown after checking: what a careful reader makes of this line */
  why: string;
}

export interface Section {
  id: SectionId;
  title: string;
  /** what a reader should check in this section */
  asks: string;
  statements: Statement[];
}

/** What the invented team actually knows about the invented model. */
export const FACT_SHEET: string[] = [
  'HeySunny-S, version 0.3: a small neural network that listens to 1-second audio clips and answers "wake word heard" or "not heard".',
  'Built for a hands-free toy speaker used by adults in a quiet home, in English.',
  'Trained on 120,000 clips from 3,000 volunteer speakers who consented, recorded indoors, English, ages 18 to 65.',
  'Tested on 8,000 clips from 400 other speakers; 4,000 clips contain the wake word.',
  'Overall: 4.1% of real wake words missed (false rejects); 0.6 false accepts per hour of TV and talk.',
  'Missed wake words by group: adults 3.2%, children aged 6 to 12 9.8% (only 300 clips), quiet room 2.5%, cafe noise 8.7%.',
  'Not tested: other languages, strong accents (accent was not recorded), speakers over 65, speech differences, any use outside a home.',
  'Audio is personal data. The design keeps audio on the device. A false accept could record speech by mistake.',
];

export const SECTIONS: Section[] = [
  {
    id: 'details',
    title: 'Model details',
    asks: 'Which model exactly, which version, who made it, under what licence?',
    statements: [
      { id: 'd1', kind: 'solid', required: true, short: 'what the model is and its version', text: 'HeySunny-S version 0.3, a small neural network that takes 1-second audio clips and answers "wake word heard" or "not heard". Made by the example team.', why: 'Names the model, the version, the input and the output, so a reader knows what the rest of the card is about.' },
      { id: 'd2', kind: 'vague', text: 'A state-of-the-art, highly accurate AI model.', why: 'Marketing, not information. It says nothing a reader can check, and "state of the art" has no stated benchmark.' },
    ],
  },
  {
    id: 'intended',
    title: 'Intended use and out-of-scope use',
    asks: 'What was it built for, for whom, and what should nobody use it for?',
    statements: [
      { id: 'i1', kind: 'solid', required: true, short: 'the intended use', text: 'Intended use: a hands-free wake word for a toy speaker used by adults in a quiet home, in English.', why: 'States the task, the user, the setting and the language. Every later number only applies to this setting.' },
      { id: 'i2', kind: 'solid', required: true, short: 'out-of-scope uses', text: 'Out of scope: safety-critical alerts such as calling emergency services, identifying who is speaking, and use by young children until tested.', why: 'A card that names what the model is not for gives people a reason to stop before misuse.' },
      { id: 'i3', kind: 'unsupported', text: 'Works for everyone, everywhere.', why: 'The team tested one language and one kind of setting. A universal claim has no evidence behind it.' },
    ],
  },
  {
    id: 'factors',
    title: 'Factors',
    asks: 'Which groups and conditions was performance checked across?',
    statements: [
      { id: 'f1', kind: 'solid', required: true, short: 'the groups and conditions checked', text: 'Checked across adults (18 to 65) and children (6 to 12), and across a quiet room and cafe noise.', why: 'Names the slices, so a reader can tell which people and places the numbers cover.' },
      { id: 'f2', kind: 'vague', text: 'Tested across diverse users.', why: '"Diverse" is not a list. Which groups, in which conditions?' },
    ],
  },
  {
    id: 'metrics',
    title: 'Metrics',
    asks: 'What is measured, how, and why that measure?',
    statements: [
      { id: 'm1', kind: 'solid', required: true, short: 'which metrics and why', text: 'Missed wake words (false rejects, as a percentage of real wake words) and false accepts per hour. Misses annoy people; false accepts record speech by mistake.', why: 'Defines each measure and says why it was chosen. The two errors have different costs.' },
      { id: 'm2', kind: 'unsupported', text: 'Accuracy: 98%.', why: 'The team measured nothing called accuracy. A single unexplained percentage also hides which error is happening.' },
    ],
  },
  {
    id: 'evaldata',
    title: 'Evaluation data',
    asks: 'What was it tested on, and was that data kept apart from training?',
    statements: [
      { id: 'e1', kind: 'solid', required: true, short: 'the evaluation data', text: '8,000 clips from 400 speakers who were not in the training set; 4,000 clips contain the wake word.', why: 'Size, source and separation from training: the three things a reader needs to trust a score.' },
      { id: 'e2', kind: 'vague', text: 'Evaluated on internal data.', why: 'Internal how? How much? Was it kept out of training? A reader cannot tell.' },
    ],
  },
  {
    id: 'traindata',
    title: 'Training data',
    asks: 'What did it learn from, and who is missing?',
    statements: [
      { id: 't1', kind: 'solid', required: true, short: 'the training data', text: '120,000 clips from 3,000 consenting volunteer speakers, recorded indoors, in English, aged 18 to 65.', why: 'Says who was recorded and how, so the gaps (children, other languages, noisy places) are visible.' },
      { id: 't2', kind: 'vague', text: 'Trained on a large, high-quality dataset.', why: '"Large" and "high-quality" are claims without numbers or sources.' },
    ],
  },
  {
    id: 'analyses',
    title: 'Quantitative analyses',
    asks: 'What are the results, split by group, and how certain are they?',
    statements: [
      { id: 'a1', kind: 'solid', required: true, short: 'results by group', text: 'Overall: 4.1% of wake words missed, 0.6 false accepts per hour. Missed by group: adults 3.2%, children 9.8%, quiet room 2.5%, cafe noise 8.7%.', why: 'Results split by group show the gap that the overall number hides: children and noise are weaker.' },
      { id: 'a3', kind: 'solid', text: 'The children figure comes from only 300 clips, so treat it as rough. No confidence intervals yet.', why: 'Admits small samples. See the lesson on whether a difference is real.' },
      { id: 'a2', kind: 'unsupported', text: 'Performance is the same for all groups.', why: 'The numbers say the opposite: children are missed three times as often as adults.' },
    ],
  },
  {
    id: 'ethics',
    title: 'Ethical considerations',
    asks: 'What could go wrong for people, and what was done about it?',
    statements: [
      { id: 'et1', kind: 'solid', required: true, short: 'ethical considerations and data', text: 'Audio is personal data. Volunteers consented to training use. The design keeps audio on the device. A false accept could record speech by mistake.', why: 'Names the sensitive data, the consent, the mitigation and the remaining risk.' },
      { id: 'et2', kind: 'vague', text: 'No ethical concerns.', why: 'A microphone in a home always raises some. "None" usually means nobody looked.' },
    ],
  },
  {
    id: 'caveats',
    title: 'Caveats and recommendations',
    asks: 'What was not tested, and what should happen before wider use?',
    statements: [
      { id: 'c1', kind: 'solid', required: true, short: 'what was not tested and next steps', text: 'Not tested: other languages, strong accents (accent was not recorded), speakers over 65, speech differences. Children are served worst. Retrain and re-test before widening use.', why: 'Lists the gaps and the next step, which is what a deployer most needs to read.' },
      { id: 'c2', kind: 'vague', text: 'May occasionally make mistakes.', why: 'True of everything, so it tells the reader nothing about where or how often.' },
    ],
  },
];

export type SectionStatus = 'missing' | 'weak' | 'partial' | 'complete';

export interface SectionReport {
  id: SectionId;
  title: string;
  status: SectionStatus;
  requiredHave: number;
  requiredTotal: number;
  /** red flags: statements chosen that are vague or unsupported */
  flags: Statement[];
  /** solid required statements still missing */
  missing: Statement[];
}

export interface CardReport {
  sections: SectionReport[];
  complete: number;
  total: number;
  flagCount: number;
  /** every section complete and no red flag anywhere */
  ready: boolean;
}

export function reportCard(chosen: ReadonlySet<string>, sections: Section[] = SECTIONS): CardReport {
  const reports: SectionReport[] = sections.map((s) => {
    const picked = s.statements.filter((st) => chosen.has(st.id));
    const required = s.statements.filter((st) => st.required);
    const have = required.filter((st) => chosen.has(st.id));
    const flags = picked.filter((st) => st.kind !== 'solid');
    const missing = required.filter((st) => !chosen.has(st.id));
    let status: SectionStatus;
    if (picked.length === 0) status = 'missing';
    else if (have.length === 0) status = 'weak';
    else if (have.length < required.length || flags.length > 0) status = 'partial';
    else status = 'complete';
    return { id: s.id, title: s.title, status, requiredHave: have.length, requiredTotal: required.length, flags, missing };
  });
  const complete = reports.filter((r) => r.status === 'complete').length;
  const flagCount = reports.reduce((n, r) => n + r.flags.length, 0);
  return { sections: reports, complete, total: reports.length, flagCount, ready: complete === reports.length && flagCount === 0 };
}

/** Plain-text version of the card as chosen, for the preview. */
export function cardText(chosen: ReadonlySet<string>, sections: Section[] = SECTIONS): string {
  return sections
    .map((s) => {
      const lines = s.statements.filter((st) => chosen.has(st.id)).map((st) => `- ${st.text}`);
      return `${s.title}\n${lines.length ? lines.join('\n') : '- (empty)'}`;
    })
    .join('\n\n');
}
