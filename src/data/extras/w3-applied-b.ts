import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "applied-b" batch. */
export const extrasW3AppliedB: Record<string, Extra> = {
  'ml/clustering-and-dimensionality-reduction': {
    takeaways: [
      'k-means alternates two steps, assign each point to the nearest centre and move each centre to the mean of its points. It needs k, depends on its start and on scaling, and assumes round clusters.',
      'Inertia always falls as k grows. The elbow and the silhouette score favour compact blobs, so they can prefer a wrong answer on moons, rings or stripes. Judge clusters by the decision they feed.',
      'DBSCAN finds crowded regions of any shape and labels the rest as noise, but eps is one global radius. Hierarchical clustering gives a tree that you cut afterwards.',
      'PCA is the linear flat view that keeps the most spread. t-SNE and UMAP show neighbourhoods, not sizes or gaps, and the picture changes with settings and seeds.',
    ],
    prereq: ['ml/linear-and-logistic-regression'],
    quiz: [
      { q: 'Two customers are 30 years apart in age and 1,000 apart in income. Why can k-means on the raw columns ignore age?', options: ['Age cannot be used in distances', 'The distance is about 1,000.45, almost all of it from income, so age barely counts', 'k-means only works on one column', 'Income is always more important'], answer: 1, why: 'The distance is the square root of 30 squared plus 1,000 squared. Put columns on a similar scale first.' },
      { q: 'On two interleaved moons, k-means with k = 2 has a silhouette of 0.48 and the correct grouping has 0.32. What does this show?', options: ['k-means is correct here', 'The silhouette measures compactness, so it can prefer a wrong grouping of non-round shapes', 'The correct grouping has an error', 'Silhouette only works on rings'], answer: 1, why: 'Silhouette rewards compact, well-separated groups. It is a sanity check, not proof that the groups match anything real.' },
      { q: 'With min points 4 (counting itself), a point has only 2 other points within eps, but lies within eps of a core point. What is it in DBSCAN?', options: ['A core point', 'Noise', 'A cluster of its own', 'A border point'], answer: 3, why: 'It is not dense enough to be core, but it is reachable from a core point, so it joins that cluster as a border point.' },
      { q: 'A 3D cloud has PCA shares of 81%, 17.6% and 1.4%. How much of its spread does the best flat 2D view keep?', options: ['About 99%', 'About 81%', 'About 67%', 'About 17.6%'], answer: 0, why: 'The best plane is the first two components, so it keeps 81% + 17.6% = 98.6%.' },
    ],
  },
  'ml/anomaly-detection': {
    takeaways: [
      'Anomalies are rare, often unlabelled and of unseen kinds, so plain accuracy misleads. A plain z-score is fooled by the outliers it looks for (masking); the median and MAD, or IQR fences, are robust.',
      'Isolation forests score a point by how few random cuts isolate it. They handle many columns but are not a cure-all, and a seasonal series needs its seasonal pattern removed before flagging.',
      'When anomalies are rare, most alerts are false even for a good detector: at 1 anomaly in 10,000, 90% recall and a 0.1% false alarm rate, only about 8% of alerts are real.',
      'Choose the threshold from what a miss costs against a false alarm, or from an alert budget, and keep a human review loop whose verdicts become labels.',
    ],
    prereq: ['ml/is-the-difference-real'],
    quiz: [
      { q: 'Ten readings are about 20, plus two faults at 45 and 52. Their z-scores are only 1.68 and 2.29. What is happening and what helps?', options: ['The faults are really normal', 'The z-score is too strict, so raise the data', 'Masking: the faults inflate the mean and spread, so use the median and MAD', 'Nothing, a z-score always works'], answer: 2, why: 'Large outliers drag the mean and standard deviation. The median and MAD barely move, so the faults score 84 and 108.' },
      { q: '100,000 events a day, 1 in 10,000 truly anomalous, 90% recall and a 0.1% false alarm rate. About what share of alerts are real?', options: ['About 8%', 'About 50%', 'About 90%', 'About 99.9%'], answer: 0, why: '9 real alerts against about 100 false ones is 9 out of 109. The rarity of anomalies, not the detector, makes most alerts false.' },
      { q: 'In an isolation forest, a point needs about 3 random cuts to be isolated and a typical point needs about 12. What does that suggest?', options: ['The point is more likely normal', 'Path length has nothing to do with anomalies', 'The forest needs labels to say', 'The point is more likely an anomaly, because it is easy to isolate'], answer: 3, why: 'Anomalies are few and different, so random cuts cut them off quickly. Short average paths give scores near 1.' },
      { q: 'Traffic of 100 requests arrives at 03:00 when the usual figure is about 30. A plain z-score over the whole week misses it. Why?', options: ['The value is too small to measure', 'Across the whole week, 100 is an ordinary value; only compared with the same hour is it odd', 'z-scores only handle spikes upwards', 'The week is too long'], answer: 1, why: 'The daily cycle makes 100 a normal level at some hours. Subtracting the usual value for each hour exposes the contextual anomaly.' },
    ],
  },
};
