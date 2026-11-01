/*
 * Data and logic for the "explore a job" deck in start/ai-and-careers.
 * Every factual line in `checked` was read on 1 November 2026 from the source named in `source`.
 * The role descriptions are plain-words summaries, not job adverts. Nothing here predicts anyone's career.
 */

export type GroupId = 'build' | 'check' | 'teach' | 'use';
export type InterestId = 'people' | 'making' | 'puzzles' | 'words' | 'outdoors';
export type SkillId = 'curious' | 'numbers' | 'writing' | 'thinking' | 'field' | 'people' | 'careful';

export const GROUPS: Record<GroupId, { label: string; blurb: string }> = {
  build: { label: 'Building it', blurb: 'Making the AI and the apps around it.' },
  check: { label: 'Checking it', blurb: 'Finding mistakes before they reach people.' },
  teach: { label: 'Teaching it', blurb: 'Giving AI the examples it learns from.' },
  use: { label: 'Using it', blurb: 'Ordinary jobs where AI is one more tool.' },
};

export const INTERESTS: Record<InterestId, string> = {
  people: 'Helping people',
  making: 'Making and fixing things',
  puzzles: 'Puzzles and numbers',
  words: 'Words, drawing and design',
  outdoors: 'Being outdoors',
};

export const SKILLS: Record<SkillId, string> = {
  curious: 'Curiosity',
  numbers: 'Numbers and maths',
  writing: 'Clear writing',
  thinking: 'Clear thinking',
  field: 'Knowing the field',
  people: 'Working with people',
  careful: 'Patience and care',
};

export interface Role {
  id: string;
  name: string;
  group: GroupId;
  interests: InterestId[];
  skills: SkillId[];
  /** What they do all day, in two short sentences. */
  day: string;
  /** How to start, for someone at school. */
  start: string;
  /** A Layerwise lesson that fits, as a site path. */
  lesson?: { label: string; href: string };
  /** The checked facts, each tied to a source below. */
  checked: string;
  sources: { label: string; url: string }[];
}

export const ROLES: Role[] = [
  {
    id: 'data-labeller',
    name: 'Data labeller',
    group: 'teach',
    interests: ['puzzles', 'words'],
    skills: ['careful', 'thinking'],
    day: 'Looks at pictures, sounds or text and adds the right label. Those labelled examples are what a computer learns from.',
    start: 'Try it yourself first: label a few examples in the drawing game. If you ever take paid labelling work, ask about pay and support before you start.',
    lesson: { label: 'How a computer learns from examples', href: '../how-computers-learn/' },
    checked:
      'Partnership on AI (2021) describes this work as labour-intensive, says it often has "precarious working conditions", and says it is often hidden from the people who use the finished AI.',
    sources: [
      {
        label: 'Partnership on AI: Responsible Sourcing of Data Enrichment Services (June 2021)',
        url: 'https://partnershiponai.org/responsible-sourcing-considerations/',
      },
    ],
  },
  {
    id: 'data-scientist',
    name: 'Data scientist or ML engineer',
    group: 'build',
    interests: ['puzzles', 'making'],
    skills: ['numbers', 'curious', 'thinking', 'careful'],
    day: 'Gets data ready, trains a model, and tests it on new examples. Jobs differ a lot from one company to the next.',
    start: 'Learn a little Python, then train a tiny model on a small data set. Short free courses exist for this.',
    lesson: { label: 'Python first steps', href: '../../skills/python-first-steps/' },
    checked:
      'US Bureau of Labor Statistics: data scientists typically need a bachelor\'s degree, and jobs are projected to grow 35 percent from 2025 to 2035. The Bureau counts "data scientists", not "ML engineers", so treat this as a guide. A projection is not a promise.',
    sources: [
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Data Scientists',
        url: 'https://www.bls.gov/ooh/math/data-scientists.htm',
      },
    ],
  },
  {
    id: 'researcher',
    name: 'Research scientist',
    group: 'build',
    interests: ['puzzles', 'words'],
    skills: ['numbers', 'curious', 'writing', 'thinking'],
    day: 'Asks a question nobody has answered yet, runs experiments, and writes up what happened, including what did not work.',
    start: 'Learn to read how researchers write: the reading-a-paper lesson is a gentle first step. Most research jobs ask for a master\'s degree or more.',
    lesson: { label: 'Reading an AI paper', href: '../../skills/reading-an-ai-paper/' },
    checked:
      'US Bureau of Labor Statistics, "computer and information research scientists": typically at least a master\'s degree, jobs projected to grow 22 percent from 2025 to 2035. The page says their expertise will be needed for "new technologies related to artificial intelligence (AI)".',
    sources: [
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Computer and Information Research Scientists',
        url: 'https://www.bls.gov/ooh/computer-and-information-technology/computer-and-information-research-scientists.htm',
      },
    ],
  },
  {
    id: 'software-developer',
    name: 'Software developer',
    group: 'build',
    interests: ['making', 'puzzles'],
    skills: ['thinking', 'curious', 'careful'],
    day: 'Writes, tests and fixes the code that apps run on. Many now use an AI helper for some of the typing, then check what it wrote.',
    start: 'Build a small thing that you care about, such as a quiz or a game. Python is a good first language.',
    lesson: { label: 'Python first steps', href: '../../skills/python-first-steps/' },
    checked:
      'US Bureau of Labor Statistics: typically a bachelor\'s degree, and jobs are projected to grow 10 percent from 2025 to 2035. The page cites demand from the "continued expansion of software development for artificial intelligence (AI)".',
    sources: [
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Software Developers',
        url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
      },
    ],
  },
  {
    id: 'product-designer',
    name: 'AI product designer',
    group: 'build',
    interests: ['words', 'people'],
    skills: ['people', 'writing', 'curious'],
    day: 'Decides how an AI feature looks and behaves: how it shows an answer, says when it is unsure, and lets people fix its mistakes.',
    start: 'Pick an app that uses AI. Write down where it surprised you or got something wrong, then sketch how you would fix it.',
    lesson: { label: 'Using AI without getting burned', href: '../using-ai-without-getting-burned/' },
    checked:
      'Microsoft\'s "Guidelines for Human-AI Interaction" are 18 guidelines it calls "evidence-based best practices for designing your AI user experiences", with patterns for first use, during use, when the AI is wrong, and over time.',
    sources: [
      {
        label: 'Microsoft HAX Toolkit: Guidelines for Human-AI Interaction',
        url: 'https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/',
      },
    ],
  },
  {
    id: 'ai-tester',
    name: 'AI tester or evaluator',
    group: 'check',
    interests: ['puzzles', 'people'],
    skills: ['curious', 'careful', 'numbers', 'writing'],
    day: 'Tries to catch mistakes, unfair results and unsafe behaviour by testing an AI with many examples, before and after it is released.',
    start: 'Test an AI tool on purpose. Ask it things you already know the answer to, and keep a list of what it gets wrong.',
    lesson: { label: 'Using AI without getting burned', href: '../using-ai-without-getting-burned/' },
    checked:
      'NIST\'s AI Risk Management Framework (version 1.0, January 2023) describes "test, evaluation, verification, and validation" tasks that happen throughout an AI system\'s life, carried out by people who examine the system or "detect and remediate problems". Job titles for this vary.',
    sources: [
      {
        label: 'NIST AI Risk Management Framework 1.0 (NIST AI 100-1)',
        url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf',
      },
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    group: 'use',
    interests: ['people', 'words'],
    skills: ['people', 'writing', 'field', 'careful'],
    day: 'Plans lessons, teaches, marks work and helps each student. Decides when a tool helps learning and when it gets in the way.',
    start: 'Explain something you know to a younger friend. Notice what worked. That is teaching practice.',
    lesson: { label: 'AI and school', href: '../../responsible/ai-and-school/' },
    checked:
      'US Bureau of Labor Statistics, high school teachers: typically a bachelor\'s degree, public school teachers need a state certification or licence, and employment projected to show "little or no change" from 2025 to 2035. The page says "Teachers must be comfortable with using and learning new technology". It does not mention AI.',
    sources: [
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: High School Teachers',
        url: 'https://www.bls.gov/ooh/education-training-and-library/high-school-teachers.htm',
      },
    ],
  },
  {
    id: 'nurse',
    name: 'Nurse using AI tools',
    group: 'use',
    interests: ['people', 'puzzles'],
    skills: ['people', 'careful', 'field', 'thinking'],
    day: 'Cares for patients, explains what is happening, and watches for changes. A computer may flag something in the patient record, and the nurse decides what to do.',
    start: 'Learn first aid, and enjoy biology and talking with people. Nursing education follows a recognised route in each country.',
    checked:
      'The American Nurses Association says "AI does not replace a nurse\'s decision-making, judgment, critical thinking, or assessment skills" and that nurses stay accountable. US Bureau of Labor Statistics: registered-nurse jobs projected to grow 6 percent from 2025 to 2035.',
    sources: [
      {
        label: 'American Nurses Association position statement: The Ethical Use of Artificial Intelligence in Nursing Practice (revised 2022; OJIN, May 2025)',
        url: 'https://ojin.nursingworld.org/table-of-contents/volume-30-2025/number-2-may-2025/the-ethical-use-of-artificial-intelligence-in-nursing-practice/',
      },
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Registered Nurses',
        url: 'https://www.bls.gov/ooh/healthcare/registered-nurses.htm',
      },
    ],
  },
  {
    id: 'farmer',
    name: 'Farmer using smart tools',
    group: 'use',
    interests: ['outdoors', 'making'],
    skills: ['field', 'careful', 'numbers'],
    day: 'Grows crops or looks after animals. Tools such as GPS steering and yield maps add data to the old skills of weather, soil and timing.',
    start: 'Grow something, even on a windowsill, and record what happens each week. Data starts with notes.',
    checked:
      'US Department of Agriculture (data for 2023): GPS auto-steering was used on 52 percent of midsize farms and 70 percent of large-scale crop farms. These figures count smart tools, not AI as such. The Bureau of Labor Statistics projects US farm jobs to fall 3 percent from 2025 to 2035.',
    sources: [
      {
        label: 'USDA Economic Research Service, Charts of Note: Precision agriculture use increases with farm size (10 December 2024)',
        url: 'https://www.ers.usda.gov/data-products/charts-of-note/110550',
      },
      {
        label: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Farmers, Ranchers, and Other Agricultural Managers',
        url: 'https://www.bls.gov/ooh/management/farmers-ranchers-and-other-agricultural-managers.htm',
      },
    ],
  },
  {
    id: 'support-agent',
    name: 'Customer-support agent',
    group: 'use',
    interests: ['people', 'words'],
    skills: ['people', 'writing', 'careful'],
    day: 'Answers customers\' questions by chat or phone and solves their problems. An AI assistant may be working alongside.',
    start: 'Practise explaining a hard thing in a short, kind message. Clear writing is the core skill.',
    checked:
      'A study of 5,172 support agents at one company found an AI chat assistant raised the number of issues solved per hour by 15 percent on average. Newer, less experienced agents gained most. One company is not every workplace.',
    sources: [
      {
        label: 'Brynjolfsson, Li and Raymond (2025), Generative AI at Work, Quarterly Journal of Economics (the publisher blocks automated checks; the DOI was confirmed through Crossref)',
        url: 'https://doi.org/10.1093/qje/qjae044',
      },
    ],
  },
];

export const ROLE_IDS = ROLES.map((r) => r.id);

export function roleById(id: string): Role | undefined {
  return ROLES.find((r) => r.id === id);
}

/** Roles that match at least one chosen interest, best matches first, ties in deck order. */
export function matchRoles(interests: InterestId[]): { role: Role; hits: number }[] {
  if (interests.length === 0) return ROLES.map((role) => ({ role, hits: 0 }));
  return ROLES.map((role, i) => ({ role, i, hits: role.interests.filter((x) => interests.includes(x)).length }))
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .map(({ role, hits }) => ({ role, hits }));
}

/** Skills that appear in more than one saved role, most common first (ties in the order SKILLS lists them). */
export function sharedSkills(ids: string[]): { skill: SkillId; count: number }[] {
  const roles = ids.map(roleById).filter((r): r is Role => !!r);
  const order = Object.keys(SKILLS) as SkillId[];
  const counts = order.map((skill) => ({ skill, count: roles.filter((r) => r.skills.includes(skill)).length }));
  return counts.filter((c) => c.count > 1).sort((a, b) => b.count - a.count || order.indexOf(a.skill) - order.indexOf(b.skill));
}
