import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { SIGNALS, START_LIKED, TOP_K, distinctTopics, organicCount, rankFeed, type SignalId } from '../../lib/feed-builder';

/**
 * "Build a feed": twelve invented posts. The learner switches signals on, likes
 * posts, and watches the feed re-sort with a one-line reason for each post.
 * "Mix it up" shows the same signals with some variety pushed back in.
 */
export default function FeedBuilder() {
  const [on, setOn] = useState<SignalId[]>([]);
  const [liked, setLiked] = useState<string[]>(START_LIKED);
  const [mix, setMix] = useState(false);

  const likedSet = useMemo(() => new Set(liked), [liked]);
  const feed = useMemo(() => rankFeed(on, likedSet, mix), [on, likedSet, mix]);
  const topics = distinctTopics(feed);
  const shown = organicCount(feed);

  const toggleSignal = (id: SignalId) => setOn((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));
  const toggleLike = (id: string) => setLiked((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));
  const reset = () => {
    setOn([]);
    setLiked(START_LIKED);
    setMix(false);
  };

  return (
    <Root>
      <div className="viz wsb-lab">
        <p className="viz-title">Build a feed</p>
        <p className="wsb-lead">
          These twelve posts are made up. Switch on the things the feed is allowed to look at, and watch it re-order. You have already liked the two posts marked <b>Liked</b>.
        </p>

        <div className="wsb-signals" role="group" aria-label="Signals the feed can use">
          {SIGNALS.map((s) => (
            <button key={s.id} type="button" className={`wsb-sig${on.includes(s.id) ? ' is-on' : ''}`} aria-pressed={on.includes(s.id)} onClick={() => toggleSignal(s.id)} title={s.hint}>
              {s.label}
            </button>
          ))}
        </div>

        <ol className="wsb-feed">
          {feed.map((r, i) => {
            const isLiked = likedSet.has(r.post.id);
            return (
              <motion.li key={r.post.id} layout transition={{ duration: 0.35, ease: EASE }} className={`wsb-post wsb-t-${r.post.ad ? 'ad' : r.post.topic}${i < TOP_K ? ' is-top' : ''}`}>
                <span className="wsb-rank" aria-hidden="true">{i + 1}</span>
                <div className="wsb-body">
                  <p className="wsb-title">
                    {r.post.ad ? <span className="wsb-chip wsb-ad">Ad</span> : <span className="wsb-chip">{r.post.topic}</span>}
                    {r.post.friend && <span className="wsb-chip wsb-friend">friend</span>}
                    <span className="wsb-name">{r.post.title}</span>
                  </p>
                  <p className="wsb-why"><span className="wsb-why-k">Why you see this: </span>{r.why}</p>
                </div>
                {!r.post.ad && (
                  <button type="button" className={`wsb-like${isLiked ? ' is-liked' : ''}`} aria-pressed={isLiked} onClick={() => toggleLike(r.post.id)} aria-label={`${isLiked ? 'Unlike' : 'Like'}: ${r.post.title}`}>
                    {isLiked ? 'Liked' : 'Like'}
                  </button>
                )}
              </motion.li>
            );
          })}
        </ol>

        <div className="wsb-actions">
          <button type="button" className={`wsb-btn${mix ? ' is-on' : ''}`} aria-pressed={mix} onClick={() => setMix((m) => !m)}>
            {mix ? 'Mixed up: tap to undo' : 'Mix it up'}
          </button>
          <button type="button" className="wsb-btn" onClick={reset}>
            Start again
          </button>
        </div>

        <p className="wsb-count" aria-live="polite">
          The first {TOP_K} slots hold <b className="num">{shown}</b> real posts and one ad. They cover <b className="num">{topics}</b> {topics === 1 ? 'topic' : 'topics'}.
          {on.includes('topic') && !mix && topics <= 2 && ' This is a filter bubble: the feed keeps showing what you already liked.'}
          {mix && ' Mixing it up puts other topics back in.'}
        </p>
        <p className="viz-cap">Everything here is invented: the posts, the likes and the watch times. Real apps use far more signals and keep their recipes private.</p>
      </div>
    </Root>
  );
}
