import type { Extra } from '../lesson-extras';

export const extrasMathsMl4: Record<string, Extra> = {
  'maths/svd-and-low-rank': {
    takeaways: [
      'The singular value decomposition splits any matrix into stretches along perpendicular directions, ordered by size.',
      'Keeping only the largest singular values gives the best low-rank approximation.',
      'The error of a rank-one approximation of a 2 by 2 matrix is the second singular value.',
      'Low-rank methods compress models and data, and low-rank adaptation (LoRA) uses the same idea for fine-tuning.',
    ],
    prereq: ['maths/eigenvectors-and-pca'],
    quiz: [
      { q: 'What are the singular values of the diagonal matrix with entries 3 and 1?', options: ['3 and 1', '9 and 1', '3 and 0', '1 and 1'], answer: 0, why: 'For a diagonal matrix the singular values are the absolute diagonal entries, 3 and 1.' },
      { q: 'What is the squared error of the best rank-one approximation of a 2 by 2 matrix?', options: ['The first singular value squared', 'The second singular value squared', 'Zero', 'The trace'], answer: 1, why: 'Keeping σ₁ leaves an error whose size is σ₂, so its squared error is σ₂².' },
    ],
  },
  'maths/elbo-and-variational-inference': {
    takeaways: [
      'The true posterior over hidden variables is often too hard to compute exactly.',
      'Variational inference replaces it with a simpler guess q and optimises that guess.',
      'The ELBO is a computable lower bound on the log evidence, and it equals the evidence minus the KL divergence to the true posterior.',
      'Maximising the ELBO both raises the bound and moves q towards the true posterior.',
    ],
    prereq: ['maths/entropy-and-kl-divergence'],
    quiz: [
      { q: 'The ELBO is always what, compared with the log evidence?', options: ['Greater or equal', 'Less than or equal', 'Exactly equal', 'Unrelated'], answer: 1, why: 'The ELBO is a lower bound, so it sits at or below the log evidence.' },
      { q: 'When does the ELBO reach the log evidence?', options: ['When q is uniform', 'When q equals the true posterior', 'When q is zero', 'Never'], answer: 1, why: 'The gap is the KL divergence to the posterior, which is zero only when the guess matches it.' },
    ],
  },
  'maths/fourier-transform': {
    takeaways: [
      'The Fourier transform splits a signal into the sine waves that make it up.',
      'Each frequency in the spectrum has a height equal to the amplitude of that wave.',
      'The discrete transform multiplies the signal by a wave at each frequency and adds the results.',
      'Spectrograms and frequency features in audio models rely on this idea.',
    ],
    prereq: ['maths/matrices-as-layers'],
    quiz: [
      { q: 'In a spectrum, what does a spike at a frequency show?', options: ['The signal has a wave at that frequency', 'The signal is zero there', 'The sample rate is wrong', 'The loss is high'], answer: 0, why: 'A spike means the signal contains a wave at that frequency, with height equal to its amplitude.' },
      { q: 'What does the discrete Fourier transform compute for each frequency?', options: ['The mean of the signal', 'The signal multiplied by a wave at that frequency, summed', 'The maximum value', 'The number of samples'], answer: 1, why: 'Each term multiplies a sample by a complex wave at that frequency, and the sum shows how much that frequency is present.' },
    ],
  },
};
