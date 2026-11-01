import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "resp-b" batch. */
export const extrasW4RespB: Record<string, Extra> = {
  'responsible/human-oversight-and-when-ai-should-not-decide': {
    takeaways: [
      '"Human in the loop" names where a person sits. It protects only if the person has time, evidence, authority and a cheap way to say no.',
      'Automation bias affects experts as well as novices, and alert fatigue comes mostly from repeated, low-value alerts. Measure reviewers by reject rates and time per item.',
      'Do not delegate decisions that are high-stakes and hard to reverse, cannot be contested by the person affected, or have no reliable ground truth.',
      'EU AI Act Article 14 asks for oversight in this practical sense for high-risk systems: understand, watch, override, stop. Legal scope is a question for your lawyer.',
    ],
    prereq: ['start/using-ai-without-getting-burned'],
    quiz: [
      {
        q: 'A reviewer approves 200 AI recommendations a day and rejects almost none. What is the most useful first conclusion?',
        options: ['The AI is almost perfect', 'The review may be a rubber stamp, so check reject rates, time per item and later reversals', 'The reviewer is doing an excellent job', 'The reviewer should be given more items'],
        answer: 1,
        why: 'A near-zero reject rate is a warning sign: it can mean the AI is right, or that nobody is really checking.',
      },
      {
        q: 'What does the research the lesson cites say about automation bias?',
        options: ['Only inexperienced people show it', 'Training and instructions remove it', 'It affects experts too and cannot be prevented by training or instructions alone', 'It only happens with aeroplane autopilots'],
        answer: 2,
        why: 'Parasuraman and Manzey found it in novices and experts, and that instructions and training do not prevent it, so the design of the task matters.',
      },
      {
        q: 'In the review-desk model, why can reviewing only the lowest-confidence items catch more errors than reviewing everything?',
        options: ['Low-confidence items are always wrong', 'Machines review more accurately than people', 'Reviewing everything is always slower but never less accurate', 'An overloaded reviewer loses attention, and errors cluster where the review is aimed'],
        answer: 3,
        why: 'The model lowers the chance of noticing an error as load rises, and targeted review helps only when the confidence score really puts errors in the low tier.',
      },
      {
        q: 'Which decision best fits "should not be delegated to AI alone"?',
        options: ['Refusing someone a benefit, with no way for them to challenge it and no reliable way to check the label', 'Choosing a playlist', 'Suggesting a spelling correction', 'Sorting photos by date'],
        answer: 0,
        why: 'It is high-stakes, hard to contest and has no reliable ground truth, which are the lesson\'s three tests.',
      },
    ],
  },
  'responsible/where-the-data-comes-from': {
    takeaways: [
      '"Is it legal?" is three questions: the data going in, whether the weights contain works, and what comes out. As of 1 November 2026 courts in the US, Germany and the UK have decided narrow cases differently, and the law is unsettled.',
      'Easy to download is not the same as licensed. Keep provenance records: source, licence, date, opt-outs respected.',
      'robots.txt is a request crawlers are asked to honour, not access control. EU opt-outs must be machine-readable, and providers of general-purpose models need a copyright policy and a public training summary.',
      'Code, weights and data carry separate licences, and the texts do not say whether a trained model is an adaptation of its data. Read the clauses and ask a lawyer.',
    ],
    prereq: ['responsible/privacy-engineering-for-ai'],
    quiz: [
      {
        q: 'A dataset is licensed CC BY-NC 4.0 and you want to use it in a paid product. What does the checker (reading the licence text) say?',
        options: ['It is fine if you give credit', 'It appears ruled out, because NonCommercial excludes uses aimed at commercial advantage', 'It is fine because the model is not a copy', 'It depends only on the model licence'],
        answer: 1,
        why: 'NonCommercial means not primarily intended for commercial advantage or monetary compensation, so a paid product needs the owner\'s permission.',
      },
      {
        q: 'What does RFC 9309 say about the rules in robots.txt?',
        options: ['They are a legal contract with every crawler', 'They block access technically', 'They are requests that crawlers are asked to honour, and are not a form of access authorisation', 'They apply only to Google'],
        answer: 2,
        why: 'The standard says crawlers are requested to honour the rules and that they are not access authorisation.',
      },
      {
        q: 'The Munich and London courts reached opposite findings about weights. Why does the lesson say that is not a contradiction?',
        options: ['One of the courts made a mistake', 'They applied different laws to different facts, and disagree on whether weights can hold a copy', 'The UK has no copyright law', 'The Munich case was about images'],
        answer: 1,
        why: 'Munich applied EU and German law to memorised song lyrics, London applied UK statute to Stable Diffusion; each court decided its own case.',
      },
      {
        q: 'Which statement about the US cases is accurate as of 1 November 2026?',
        options: ['The Supreme Court has settled that training is fair use', 'The Kadrey ruling said Meta\'s training is lawful in general', 'A settlement in the Bartz case was a ruling that training is illegal', 'Judges have decided narrow cases on their facts, and the generative-AI question has not been settled by an appeals court'],
        answer: 3,
        why: 'Bartz and Kadrey were district-court rulings on their records, the Bartz settlement is not a ruling on the law, and the ROSS appeal involved a non-generative tool.',
      },
    ],
  },
};
