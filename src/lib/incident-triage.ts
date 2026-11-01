/*
 * Logic for the incident-triage exercise in the AI governance lesson. The incidents are invented.
 * The rubric below is an example written for this lesson. It is not NIST's, ISO's or the EU's, and
 * real incident decisions need people with the context and authority to make them.
 */

export type Harm = 'none' | 'minor' | 'serious';
export type Reach = 'few' | 'many';
export type Action = 'backlog' | 'week' | 'escalate';

export interface IncidentFacts {
  harm: Harm;
  reach: Reach;
  /** still happening now */
  ongoing: boolean;
  /** personal data or someone's rights are involved */
  personal: boolean;
  /** the harm cannot be undone */
  irreversible: boolean;
}

export interface Incident {
  id: string;
  title: string;
  report: string;
  facts: IncidentFacts;
}

export const ACTIONS: { id: Action; label: string; detail: string }[] = [
  { id: 'backlog', label: 'Log it and fix in the normal backlog', detail: 'Score 0 or 1' },
  { id: 'week', label: 'Tell the owner and fix this week', detail: 'Score 2 to 4' },
  { id: 'escalate', label: 'Escalate now: limit or pause the feature, inform the risk owner', detail: 'Score 5 or more' },
];

export const POINTS = {
  harm: { none: 0, minor: 1, serious: 3 } as Record<Harm, number>,
  many: 1,
  ongoing: 1,
  personal: 2,
  irreversible: 1,
};

export interface ScoreLine {
  label: string;
  points: number;
}

export function scoreLines(f: IncidentFacts): ScoreLine[] {
  const lines: ScoreLine[] = [{ label: `Harm to people: ${f.harm}`, points: POINTS.harm[f.harm] }];
  lines.push({ label: f.reach === 'many' ? 'Many people or requests affected' : 'Few people or requests affected', points: f.reach === 'many' ? POINTS.many : 0 });
  lines.push({ label: f.ongoing ? 'Still happening' : 'Not happening now', points: f.ongoing ? POINTS.ongoing : 0 });
  lines.push({ label: f.personal ? 'Personal data or rights involved' : 'No personal data or rights involved', points: f.personal ? POINTS.personal : 0 });
  lines.push({ label: f.irreversible ? 'Harm cannot be undone' : 'Harm can be undone', points: f.irreversible ? POINTS.irreversible : 0 });
  return lines;
}

export function score(f: IncidentFacts): number {
  return scoreLines(f).reduce((s, l) => s + l.points, 0);
}

export function recommended(f: IncidentFacts): Action {
  const s = score(f);
  if (s >= 5) return 'escalate';
  if (s >= 2) return 'week';
  return 'backlog';
}

/** Within one point of a cut-off: reasonable people could differ. */
export function borderline(f: IncidentFacts): boolean {
  const s = score(f);
  return s === 1 || s === 2 || s === 4 || s === 5;
}

export const INCIDENTS: Incident[] = [
  {
    id: 'hours',
    title: 'Wrong opening hours',
    report: 'The shop support bot told three customers that the shop opens at 9 on Sunday. It opens at 10. A prompt change on Monday already fixed it.',
    facts: { harm: 'minor', reach: 'few', ongoing: false, personal: false, irreversible: false },
  },
  {
    id: 'leak',
    title: 'Another customer\'s details in a reply',
    report: 'The ticket summariser sometimes pastes another customer\'s order number and email address into a reply. About 2 in 100 replies show it, and it happened again this morning.',
    facts: { harm: 'minor', reach: 'many', ongoing: true, personal: true, irreversible: false },
  },
  {
    id: 'cv',
    title: 'CVs with career gaps score lower',
    report: 'A recruiter noticed that the CV screener gives lower scores to applicants with a career gap. She found 20 cases in a week. The screener is still in use.',
    facts: { harm: 'serious', reach: 'many', ongoing: true, personal: true, irreversible: false },
  },
  {
    id: 'format',
    title: 'Odd formatting after an update',
    report: 'Since Tuesday\'s prompt update the chatbot sometimes answers in broken bullet points. Nothing is wrong with the content. Most users see it.',
    facts: { harm: 'none', reach: 'many', ongoing: true, personal: false, irreversible: false },
  },
  {
    id: 'advert',
    title: 'Wake word triggered by a TV advert',
    report: 'A TV advert woke about 50 smart speakers, which recorded 3 seconds of room audio each. The audio has been deleted and the advert has finished.',
    facts: { harm: 'minor', reach: 'many', ongoing: false, personal: true, irreversible: false },
  },
  {
    id: 'deprecated',
    title: 'Deprecated function suggested',
    report: 'The coding assistant suggested a deprecated function in 5 pull requests this month. Tests caught every one. It keeps doing it.',
    facts: { harm: 'none', reach: 'few', ongoing: true, personal: false, irreversible: false },
  },
];

export function grade(chosen: Partial<Record<string, Action>>, incidents: Incident[] = INCIDENTS): { answered: number; matched: number; total: number } {
  let answered = 0;
  let matched = 0;
  for (const i of incidents) {
    const c = chosen[i.id];
    if (c) {
      answered++;
      if (c === recommended(i.facts)) matched++;
    }
  }
  return { answered, matched, total: incidents.length };
}
