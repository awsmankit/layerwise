import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "resp-c" batch. */
export const extrasW4RespC: Record<string, Extra> = {
  'responsible/energy-and-water-of-ai': {
    takeaways: [
      'A watt-hour is energy. Published figures for one short AI text reply run from about 0.05 to about 1 Wh, depending on what is counted, and reasoning, image and video requests can cost tens to hundreds of times more.',
      'Energy goes into training (once), use (every request, now the larger share according to the IEA) and overhead such as cooling, idle machines and building the hardware. To estimate it, multiply power by time, or tokens by energy per token.',
      'Per-query and water figures disagree by large factors because they count different things: chips only, the whole data centre, or the whole life cycle. Any single-number claim is missing its boundary, date or source.',
      'Smaller models, fewer tokens, busy chips (caching and batching), on-device models and cleaner grids are the levers, and measuring beats guessing.',
    ],
    prereq: [],
    quiz: [
      {
        q: 'A 10 W LED bulb stays on for 6 minutes. How much energy does it use?',
        options: ['10 Wh', '1 Wh', '0.1 Wh', '60 Wh'],
        answer: 1,
        why: 'Energy is power times time: 10 W for 0.1 hour is 1 Wh.',
      },
      {
        q: 'Google reports 0.24 Wh for a median Gemini text prompt and a chips-only figure of 0.10 Wh. Why do they differ?',
        options: [
          'They measured two different prompts',
          'One of them includes training',
          'The larger figure also counts idle machines, host computers and cooling',
          'One is in watt-hours and the other is not',
        ],
        answer: 2,
        why: 'Google says the comprehensive figure covers the whole serving system and data-centre overhead. The narrower one counts only the active accelerators.',
      },
      {
        q: 'A headline says one AI query uses a certain number of watt-hours. What is the best first question?',
        options: [
          'What does the number count (chips only, whole data centre, whole life cycle), for what kind of request, and when was it measured?',
          'Is the number big or small?',
          'Which company is mentioned most?',
          'Is the number a round one?',
        ],
        answer: 0,
        why: 'Published figures vary by a hundred times or more because their boundaries, requests and dates differ, so a number without them cannot be compared.',
      },
      {
        q: 'Which change most often raises the energy of one request the most?',
        options: ['A shorter prompt', 'Asking in a different language', 'Serving the answer from a cache', 'Switching reasoning on, so the model writes many more tokens'],
        answer: 3,
        why: 'In the AI Energy Score tests, models with reasoning on wrote 300 to 800 times more tokens and used 150 to 700 times more energy than the same models with it off.',
      },
    ],
  },
  'responsible/medical-and-regulated-ai': {
    takeaways: [
      'Regulators regulate the product and its intended use. The FDA says it does not regulate AI as such but medical devices, including AI-enabled ones; in the EU, MDR software classification (Rule 11) follows intended purpose.',
      'A held-out score is technical validation. Clinical validation adds external and ideally prospective evidence in the real workflow, with calibration, subgroup results and workflow effects.',
      'Sensitivity and specificity travel with the model. PPV, NPV and calibration travel with the population, so the same model can have a PPV of 69% at one clinic and 15% at another.',
      'After release, plan for dataset shift: monitoring, a change process (in the US, a predetermined change control plan) and re-testing after changes such as quantisation or new hardware. This is awareness, not regulatory advice.',
    ],
    prereq: ['foundations/classical-ml-essentials'],
    quiz: [
      {
        q: 'A classifier with 90% sensitivity and 90% specificity moves from a clinic where 20% of patients have the condition to one where 2% do. What happens?',
        options: [
          'Sensitivity and specificity both fall',
          'Sensitivity and specificity stay the same, and PPV falls sharply (from about 69% to about 15%)',
          'PPV rises because there are fewer cases to find',
          'Nothing changes, because it is the same model',
        ],
        answer: 1,
        why: 'PPV = 0.02 x 0.9 / (0.02 x 0.9 + 0.98 x 0.1) is about 15%, against about 69% at 20% prevalence. The healthy majority produces most of the alarms.',
      },
      {
        q: 'Why is a strong score on a held-out set from the developing hospital not enough for clinical validation?',
        options: [
          'Held-out sets are always contaminated',
          'It measures one population, place and time, so it may not hold at other sites or in the real workflow',
          'Regulators ignore test sets',
          'Held-out sets cannot compute sensitivity',
        ],
        answer: 1,
        why: 'Wong and colleagues found the widely used Epic Sepsis Model scored an AUC of 0.63 and missed 67% of sepsis cases in an external test. External and prospective evidence checks what a local test cannot.',
      },
      {
        q: 'According to the European Commission FAQ MDCG 2025-6, when is a medical-device AI system high-risk under Article 6(1) of the AI Act?',
        options: [
          'Whenever it uses machine learning',
          'Only when it is MDR class III',
          'When it is a medical device (or a safety component) that needs a third-party conformity assessment by a notified body',
          'Only when it is used in a hospital',
        ],
        answer: 2,
        why: 'The FAQ lists classes IIa, IIb and III as involving a notified body, so they meet the condition. The AI Act does not change the MDR class.',
      },
      {
        q: 'Among the special controls for a self-fitting air-conduction hearing aid in 21 CFR 874.3325, which of these is listed?',
        options: [
          'Specified and tested electroacoustic parameters, including latency, plus software verification, validation and hazard analysis',
          'A requirement that no software is used',
          'An approval from a licensed audiologist for every user',
          'Nothing beyond general controls',
        ],
        answer: 0,
        why: 'The regulation lists clinical data on the self-fitting strategy, electroacoustic parameters including latency, software verification, validation and hazard analysis, and usability testing.',
      },
    ],
  },
};
