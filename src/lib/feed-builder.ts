/**
 * Logic for the "feed builder" in start/how-feeds-and-search-decide.
 * Twelve invented posts; the learner switches signals on and the feed is
 * sorted by a simple score. Nothing here copies a real platform's recipe:
 * the numbers (likes, watch share, hours) are made up for the lesson.
 */

export type SignalId = 'popular' | 'watch' | 'topic' | 'friend' | 'newest';
export type Topic = 'football' | 'gaming' | 'baking' | 'animals' | 'space' | 'music';

export type Post = {
  id: string;
  title: string;
  topic: Topic;
  /** Invented number of likes from everyone. */
  likes: number;
  /** Invented share of the post people usually watch, 0 to 1. */
  watch: number;
  friend: boolean;
  hoursAgo: number;
  ad?: boolean;
};

export const SIGNALS: { id: SignalId; label: string; hint: string }[] = [
  { id: 'popular', label: 'Likes from everyone', hint: 'Posts that many people liked go up.' },
  { id: 'watch', label: 'Time spent watching', hint: 'Posts people usually watch to the end go up.' },
  { id: 'topic', label: 'What you liked before', hint: 'Posts like the ones you liked go up.' },
  { id: 'friend', label: 'Friends', hint: 'Posts from your friends go up.' },
  { id: 'newest', label: 'Newest', hint: 'Recent posts go up.' },
];

export const POSTS: Post[] = [
  { id: 'p1', title: 'Last-minute goal wins the school final', topic: 'football', likes: 420, watch: 0.8, friend: false, hoursAgo: 30 },
  { id: 'p2', title: 'Easy chocolate cookies in 10 minutes', topic: 'baking', likes: 900, watch: 0.55, friend: false, hoursAgo: 5 },
  { id: 'p3', title: 'Speedrun: beating level 1 in 40 seconds', topic: 'gaming', likes: 650, watch: 0.9, friend: false, hoursAgo: 50 },
  { id: 'p4', title: 'Mia’s new puppy learns to sit', topic: 'animals', likes: 120, watch: 0.7, friend: true, hoursAgo: 2 },
  { id: 'p5', title: 'Ten football skills to learn this week', topic: 'football', likes: 780, watch: 0.6, friend: false, hoursAgo: 100 },
  { id: 'p6', title: 'How big is the Moon, really?', topic: 'space', likes: 300, watch: 0.85, friend: false, hoursAgo: 12 },
  { id: 'p7', title: 'Sam’s band plays at the talent show', topic: 'music', likes: 60, watch: 0.5, friend: true, hoursAgo: 1 },
  { id: 'p8', title: 'Hidden room found in my favourite game', topic: 'gaming', likes: 560, watch: 0.75, friend: false, hoursAgo: 8 },
  { id: 'p9', title: 'Football quiz: name that stadium', topic: 'football', likes: 210, watch: 0.65, friend: true, hoursAgo: 20 },
  { id: 'p10', title: 'Sponsored: fast trainers, 20% off', topic: 'football', likes: 0, watch: 0, friend: false, hoursAgo: 0, ad: true },
  { id: 'p11', title: 'A day at the cat café', topic: 'animals', likes: 340, watch: 0.6, friend: false, hoursAgo: 70 },
  { id: 'p12', title: 'Build a castle in a blocks game', topic: 'gaming', likes: 240, watch: 0.8, friend: false, hoursAgo: 3 },
];

/** The posts the pretend viewer has already liked when the lab opens. */
export const START_LIKED: string[] = ['p1', 'p3'];

/** The ad always sits in the third slot (index 2) so it is easy to spot. */
export const AD_SLOT = 2;
/** How many posts count as "the top of the feed" for the variety count. */
export const TOP_K = 6;

const MAX_LIKES = Math.max(...POSTS.filter((p) => !p.ad).map((p) => p.likes));
const MAX_HOURS = Math.max(...POSTS.filter((p) => !p.ad).map((p) => p.hoursAgo));

export function signalValues(post: Post, liked: ReadonlySet<string>): Record<SignalId, number> {
  const likedSameTopic = POSTS.filter((p) => !p.ad && liked.has(p.id) && p.topic === post.topic).length;
  return {
    popular: post.likes / MAX_LIKES,
    watch: post.watch,
    topic: Math.min(1, likedSameTopic / 2),
    friend: post.friend ? 1 : 0,
    newest: 1 - post.hoursAgo / MAX_HOURS,
  };
}

export type RankedPost = {
  post: Post;
  score: number;
  why: string;
  /** True when the variety re-rank pulled this post up as a new topic. */
  fresh: boolean;
};

function reasonText(id: SignalId, post: Post): string {
  switch (id) {
    case 'popular':
      return `${post.likes} people liked it`;
    case 'watch':
      return 'people usually watch most of it';
    case 'topic':
      return `you liked ${post.topic} posts before`;
    case 'friend':
      return 'it is from a friend';
    case 'newest':
      return post.hoursAgo <= 1 ? 'it was posted an hour ago or less' : `it was posted ${post.hoursAgo} hours ago`;
  }
}

function whyFor(post: Post, values: Record<SignalId, number>, on: SignalId[]): string {
  if (on.length === 0) return 'No signals are switched on, so this is just the order posted.';
  const strong = SIGNALS.filter((s) => on.includes(s.id) && values[s.id] >= 0.5)
    .sort((a, b) => values[b.id] - values[a.id])
    .slice(0, 2)
    .map((s) => reasonText(s.id, post));
  if (strong.length === 0) return 'It did not score well on the signals you switched on.';
  return `Because ${strong.join(' and ')}.`;
}

/**
 * Rank the organic posts by the sum of the switched-on signals (ties keep the
 * original order), then place the ad in slot 3. With `mix` on, each post
 * already shown from the same topic lowers the next one's score, so other
 * topics get in.
 */
export function rankFeed(on: SignalId[], liked: ReadonlySet<string>, mix = false): RankedPost[] {
  const organic = POSTS.filter((p) => !p.ad);
  const scored = organic.map((post, i) => {
    const values = signalValues(post, liked);
    const score = on.reduce((sum, id) => sum + values[id], 0);
    return { post, i, values, score };
  });
  let ordered: typeof scored;
  const fresh = new Set<string>();
  if (!mix) {
    ordered = [...scored].sort((a, b) => b.score - a.score || a.i - b.i);
  } else {
    const penalty = 0.6 * Math.max(1, on.length);
    const left = [...scored];
    ordered = [];
    const seen: Record<string, number> = {};
    while (left.length) {
      let best = 0;
      let bestVal = -Infinity;
      left.forEach((c, k) => {
        const val = c.score - penalty * (seen[c.post.topic] ?? 0);
        if (val > bestVal + 1e-9 || (Math.abs(val - bestVal) <= 1e-9 && c.i < left[best].i)) {
          best = k;
          bestVal = val;
        }
      });
      const [pick] = left.splice(best, 1);
      if (!seen[pick.post.topic] && ordered.length > 0) fresh.add(pick.post.id);
      seen[pick.post.topic] = (seen[pick.post.topic] ?? 0) + 1;
      ordered.push(pick);
    }
  }
  const out: RankedPost[] = ordered.map((c) => {
    const base = whyFor(c.post, c.values, on);
    const isFresh = fresh.has(c.post.id);
    return {
      post: c.post,
      score: c.score,
      fresh: isFresh,
      why: isFresh ? `${base.startsWith('Because') || base.startsWith('It did') ? base + ' ' : ''}A topic you have not seen yet, mixed in on purpose.`.trim() : base,
    };
  });
  const ad = POSTS.find((p) => p.ad)!;
  out.splice(AD_SLOT, 0, {
    post: ad,
    score: 0,
    fresh: false,
    why: 'A company paid to show this. Apps are meant to label ads so you can tell.',
  });
  return out;
}

/** How many different topics appear among the organic posts in the first `k` slots. */
export function distinctTopics(feed: RankedPost[], k = TOP_K): number {
  return new Set(feed.slice(0, k).filter((r) => !r.post.ad).map((r) => r.post.topic)).size;
}

export function organicCount(feed: RankedPost[], k = TOP_K): number {
  return feed.slice(0, k).filter((r) => !r.post.ad).length;
}
