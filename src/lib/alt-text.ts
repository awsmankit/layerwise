/*
 * Data for the alt-text rater in "AI for accessibility". Three invented images in three situations.
 * The expected ratings follow the W3C Web Accessibility Initiative "alt decision tree": an image that
 * adds meaning needs a short description of that meaning; a complex graphic needs its information
 * available somewhere on the page; a purely decorative image gets an empty alt attribute; and file
 * names or filler such as "image" are not descriptions (WebAIM counts these as questionable alt text).
 * The wording of the candidates and the ratings are this site's teaching judgement, not a standard.
 */

export type Rating = 'good' | 'ok' | 'poor';
export const RATINGS: Rating[] = ['good', 'ok', 'poor'];
export const RATING_LABEL: Record<Rating, string> = { good: 'Good', ok: 'Needs work', poor: 'Poor' };

export type Candidate = { id: string; text: string; rating: Rating; why: string };

export type Scenario = {
  id: 'chart' | 'dog' | 'banner';
  title: string;
  /** What a sighted reader sees, in words, so the lab works without the drawing. */
  seen: string;
  /** Where the image sits and what else is on the page. */
  context: string;
  decorative: boolean;
  candidates: Candidate[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'chart',
    title: 'A chart in a newsletter',
    seen: 'A bar chart of lunch choices: pizza 40%, pasta 25%, curry 20%, salad 15% (invented numbers).',
    context: 'It sits in a school newsletter article about lunch. The numbers are not written anywhere else on the page.',
    decorative: false,
    candidates: [
      { id: 'c1', text: 'chart', rating: 'poor', why: 'It names the kind of picture but not what it shows. A listener learns nothing about lunches.' },
      { id: 'c2', text: 'lunch-chart-final.png', rating: 'poor', why: 'A file name is not a description. WebAIM counts file names as questionable alt text.' },
      { id: 'c3', text: 'Image of a bar chart', rating: 'poor', why: 'It starts with "image of" and still says nothing about the data. Screen readers already tell the listener it is an image.' },
      { id: 'c4', text: 'Bar chart of school lunch choices: pizza 40%, pasta 25%, curry 20%, salad 15%.', rating: 'good', why: 'The data are not elsewhere on the page, so the numbers go here. It stays short enough to take in at once.' },
      { id: 'c5', text: 'Bar chart: pizza is the most popular lunch.', rating: 'ok', why: 'It gives the main point, but the figures exist only in the chart. W3C says a complex graphic needs its information available on the page, in the alt text or nearby.' },
    ],
  },
  {
    id: 'dog',
    title: 'A photo on an adoption page',
    seen: 'A small brown and white dog with a red collar, sitting on a blue sofa and looking at the camera (a drawing here).',
    context: 'It is the main photo on a dog adoption listing. The name, Biscuit, is in the heading above.',
    decorative: false,
    candidates: [
      { id: 'd1', text: 'dog', rating: 'poor', why: 'Too little. On a listing, how the dog looks is the point of the photo.' },
      { id: 'd2', text: 'Photo of a dog', rating: 'poor', why: 'It starts with "photo of" and is true of every picture on the site. It does not say which dog.' },
      { id: 'd3', text: 'Biscuit, a small brown and white dog with a red collar, sitting on a sofa and looking at the camera.', rating: 'good', why: 'It gives what the photo adds to the page: what this dog looks like and what it is doing.' },
      { id: 'd4', text: 'Biscuit', rating: 'ok', why: 'It repeats the heading and leaves out how the dog looks, which is what the photo adds.' },
      {
        id: 'd5',
        text: 'A small brown and white dog, probably a terrier cross aged about three, with a red collar, one ear up and one ear down, on a blue sofa with a cushion, in a living room with a window and a plant, looking at the camera as if waiting for a treat.',
        rating: 'ok',
        why: 'Too long, and it guesses ("probably", "as if waiting for a treat"). Describe what can be seen, briefly.',
      },
    ],
  },
  {
    id: 'banner',
    title: 'A wavy banner on an article',
    seen: 'A blue wave pattern across the top of the page. It carries no information (a drawing here).',
    context: 'It is purely decoration, above an article. Nothing in it needs to be understood.',
    decorative: true,
    candidates: [
      { id: 'b1', text: '', rating: 'good', why: 'An empty alt attribute tells assistive technology to skip the image. That is the W3C advice for purely decorative images.' },
      { id: 'b2', text: 'Blue wave pattern', rating: 'ok', why: 'Harmless, but a listener now hears something that adds nothing, every time the page loads.' },
      { id: 'b3', text: 'banner.png', rating: 'poor', why: 'A file name is read out as noise.' },
      { id: 'b4', text: 'Decorative image', rating: 'poor', why: 'It announces the image instead of hiding it. If the image is decorative, the alt attribute should be empty.' },
    ],
  },
];

export type AltFlags = { empty: boolean; fileName: boolean; startsWithImageOf: boolean; singleGenericWord: boolean };

const FILE_NAME = /\.(png|jpe?g|gif|svg|webp)\b/i;
const IMAGE_OF = /^(an? )?(image|picture|photo|photograph|graphic)( of)?\b/i;
const GENERIC = /^(image|picture|photo|graphic|chart|dog|banner|decorative image)$/i;

/** Simple checks on the alt text itself. They cover the filler patterns; judging meaning still needs a person. */
export function altFlags(text: string): AltFlags {
  const t = text.trim();
  return { empty: t === '', fileName: FILE_NAME.test(t), startsWithImageOf: IMAGE_OF.test(t), singleGenericWord: GENERIC.test(t) };
}

/** True when a candidate shows one of the filler patterns, so it can never be rated good. */
export const isFiller = (text: string): boolean => {
  const f = altFlags(text);
  return f.fileName || f.startsWithImageOf || f.singleGenericWord;
};

export type Picks = Record<string, Rating>;

/** How many of the learner's ratings match the expected ones, over the candidates they rated. */
export function agreement(scn: Scenario, picks: Picks): { rated: number; matched: number; total: number } {
  let rated = 0;
  let matched = 0;
  for (const c of scn.candidates) {
    const p = picks[c.id];
    if (!p) continue;
    rated++;
    if (p === c.rating) matched++;
  }
  return { rated, matched, total: scn.candidates.length };
}
