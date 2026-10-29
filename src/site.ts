export const site = {
  name: 'Layerwise',
  tagline: 'How AI systems work, one layer at a time',
  description:
    'Animated lessons, system design games and cost tools for AI engineers, from machine learning basics to agents and edge deployment.',
  repo: 'https://github.com/awsmankit/layerwise',
  contentLicence: { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};

/** The header holds five places; games, calculators and the glossary sit under Practice and in the footer. */
export const nav: { href: string; label: string; also?: string[] }[] = [
  { href: '/start/', label: 'Start' },
  { href: '/learn/', label: 'Learn', also: ['/glossary/'] },
  { href: '/practice/', label: 'Practice', also: ['/play/', '/tools/'] },
  { href: '/interview/', label: 'Interviews' },
  { href: '/pulse/', label: 'News' },
];

export const footerNav = [...nav, { href: '/play/', label: 'Games' }, { href: '/tools/', label: 'Calculators' }, { href: '/glossary/', label: 'Glossary' }, { href: '/cases/', label: 'Case studies' }, { href: '/watch/', label: 'Further watching' }, { href: '/progress/', label: 'Your progress' }, { href: '/teach/', label: 'For teachers' }, { href: '/about/', label: 'About' }];

/** Link groups for the footer, with the page each one opens. */
export const footerGroups = [
  {
    title: 'Learn',
    links: [
      { href: '/start/', label: 'Start here' },
      { href: '/learn/', label: 'All lessons' },
      { href: '/glossary/', label: 'Glossary' },
      { href: '/teach/', label: 'For teachers' },
    ],
  },
  {
    title: 'Practise',
    links: [
      { href: '/practice/', label: 'Practice labs' },
      { href: '/play/', label: 'Games' },
      { href: '/tools/', label: 'Calculators' },
      { href: '/tools/sandbox/', label: 'Sandbox' },
      { href: '/interview/', label: 'Interview prep' },
    ],
  },
  {
    title: 'Go further',
    links: [
      { href: '/pulse/', label: 'News' },
      { href: '/cases/', label: 'Case studies' },
      { href: '/libraries/', label: 'AI libraries map' },
      { href: '/watch/', label: 'Further watching' },
      { href: '/rss.xml', label: 'RSS feed' },
    ],
  },
  {
    title: 'This site',
    links: [
      { href: '/about/', label: 'About' },
      { href: '/progress/', label: 'Your progress' },
    ],
  },
];
