/*
 * Logic for the "grounding lab" in the hallucination lesson. One fixed question, four setups.
 * The model outputs are CANNED and INVENTED for illustration: they are not from a real model.
 * The learner marks each claim as supported or not supported by the passage the model was given
 * (setup A had no passage, so claims are checked against the shop's real policy instead, which is
 * a factuality check rather than a faithfulness check). The lab then scores each setup.
 */

export type SetupId = 'none' | 'with-answer' | 'without-answer' | 'abstain';
export type World = 'true' | 'false' | 'unverified';

export type Claim = {
  text: string;
  /** reference mark: is the claim supported by what the learner checks against in this setup? */
  supported: boolean;
  /** one line shown after the learner marks the claim */
  why: string;
  /** is the claim true according to the shop's real policy? */
  world: World;
};

export type Setup = {
  id: SetupId;
  name: string;
  given: string;
  /** passage the model was given, or null */
  context: string | null;
  /** what the learner checks claims against */
  checkAgainst: { kind: 'context' | 'policy'; label: string; text: string };
  output: string;
  claims: Claim[];
  answered: 'answered' | 'declined';
  outcome: string;
};

export const QUESTION =
  'I bought a helmet off the shelf three weeks ago and I have changed my mind. Can I return it, and who pays for the postage?';

export const POLICY_PASSAGE =
  'Returns. Unused items can be returned within 30 days of delivery with proof of purchase. Refunds go to the original payment method within 5 working days of us receiving the item. Return postage is free if the item is faulty; otherwise the customer pays return postage. Custom-built bikes cannot be returned.';

export const DELIVERY_PASSAGE =
  'Delivery. Standard delivery takes 3 to 5 working days. Orders over £50 ship free. We cannot change the address once an order has shipped. If you need more help, our team can take over the chat.';

export const SETUPS: Setup[] = [
  {
    id: 'none',
    name: 'A. No context',
    given: 'Only the question. No passage.',
    context: null,
    checkAgainst: { kind: 'policy', label: 'The shop\'s real returns policy (the model could not see it)', text: POLICY_PASSAGE },
    output:
      'Return windows are usually 14 days, so three weeks is probably too late. Return postage is usually free. Refunds take 3 to 5 days. Keep your receipt just in case.',
    claims: [
      { text: 'Return windows are usually 14 days.', supported: false, why: 'The policy says 30 days.', world: 'false' },
      { text: 'Three weeks is probably too late to return the helmet.', supported: false, why: 'Three weeks is 21 days, inside the 30-day window.', world: 'false' },
      { text: 'Return postage is usually free.', supported: false, why: 'The policy says the customer pays unless the item is faulty.', world: 'false' },
      { text: 'Refunds take 3 to 5 days.', supported: false, why: 'The policy says 5 working days after the shop receives the item.', world: 'false' },
      { text: 'You should keep your receipt.', supported: true, why: 'The policy asks for proof of purchase. Right, but by luck: the model could not see it.', world: 'true' },
    ],
    answered: 'answered',
    outcome: 'Fluent and confident, mostly wrong. It tells the customer they are too late when they are not.',
  },
  {
    id: 'with-answer',
    name: 'B. Context with the answer',
    given: 'The question plus the returns passage, retrieved by search.',
    context: POLICY_PASSAGE,
    checkAgainst: { kind: 'context', label: 'The retrieved passage the model was given', text: POLICY_PASSAGE },
    output:
      'Yes. Three weeks is inside the 30-day window, and you will need proof of purchase. The helmet is not faulty, so you pay the return postage. Your refund goes to the original payment method within 5 working days of the shop receiving it. We will email you a prepaid return label.',
    claims: [
      { text: 'You can return it: 21 days is inside the 30-day window.', supported: true, why: 'The passage gives 30 days from delivery.', world: 'true' },
      { text: 'You need proof of purchase.', supported: true, why: 'The passage says so.', world: 'true' },
      { text: 'You pay the return postage because the helmet is not faulty.', supported: true, why: 'The passage says the customer pays unless the item is faulty.', world: 'true' },
      { text: 'The refund goes to the original payment method within 5 working days of the shop receiving the item.', supported: true, why: 'Stated in the passage.', world: 'true' },
      { text: 'A prepaid return label will be emailed to you.', supported: false, why: 'Not in the passage. A helpful-sounding extra that the model added, and the customer may act on it.', world: 'unverified' },
    ],
    answered: 'answered',
    outcome: 'The right answer, with one invented promise attached. Grounding helped a lot; it did not make it perfect.',
  },
  {
    id: 'without-answer',
    name: 'C. Context without the answer',
    given: 'The question plus the delivery passage. Search found the wrong page.',
    context: DELIVERY_PASSAGE,
    checkAgainst: { kind: 'context', label: 'The retrieved passage the model was given', text: DELIVERY_PASSAGE },
    output:
      'Yes, you can return it within 30 days. Standard delivery takes 3 to 5 working days, and a return will take about as long. Return postage is free for orders over £50.',
    claims: [
      { text: 'You can return it within 30 days.', supported: false, why: 'The delivery passage says nothing about returns. It happens to match the real policy, but only by luck.', world: 'true' },
      { text: 'Standard delivery takes 3 to 5 working days.', supported: true, why: 'Stated in the passage, though it does not answer the question.', world: 'true' },
      { text: 'A return will take about as long as delivery.', supported: false, why: 'Nothing in the passage says this. It is a guess presented as a fact.', world: 'unverified' },
      { text: 'Return postage is free for orders over £50.', supported: false, why: 'The passage says orders over £50 ship free. The model turned free delivery into free returns.', world: 'false' },
    ],
    answered: 'answered',
    outcome: 'When retrieval misses, a model that is not told to hold back fills the gap. One claim is right by luck and one is wrong.',
  },
  {
    id: 'abstain',
    name: 'D. Same context, told it may abstain',
    given: 'The same delivery passage, plus an instruction: answer only from the passage; if it is not there, say so.',
    context: DELIVERY_PASSAGE,
    checkAgainst: { kind: 'context', label: 'The retrieved passage the model was given', text: DELIVERY_PASSAGE },
    output:
      'I cannot find the returns rules in the information I have, so I cannot say whether you can return it or who pays for postage. Standard delivery takes 3 to 5 working days. I can ask our team to take over this chat if you like.',
    claims: [
      { text: 'The returns rules are not in the information I was given.', supported: true, why: 'A true statement about the passage: it covers delivery only.', world: 'true' },
      { text: 'Standard delivery takes 3 to 5 working days.', supported: true, why: 'Stated in the passage.', world: 'true' },
      { text: 'A team member can take over this chat.', supported: true, why: 'The passage says the team can take over the chat.', world: 'true' },
    ],
    answered: 'declined',
    outcome: 'Every claim is supported, but the customer still has no answer. The right behaviour here, and a cost: the fix for a retrieval miss is better retrieval.',
  },
];

export type Mark = 'supported' | 'unsupported';
export type Marks = Record<string, Mark | undefined>;

export const claimKey = (setup: SetupId, index: number) => `${setup}:${index}`;

export type SetupScore = {
  total: number;
  marked: number;
  /** claims the learner marked supported */
  supportedByLearner: number;
  /** supported / marked, 0 to 1; NaN if nothing is marked */
  faithfulness: number;
  /** the same score from the reference marks, over all claims */
  reference: number;
  /** claims where the learner's mark matches the reference */
  agree: number;
  /** claims true in the shop's real policy */
  trueInWorld: number;
  falseInWorld: number;
};

export function scoreSetup(setup: Setup, marks: Marks): SetupScore {
  let marked = 0;
  let supportedByLearner = 0;
  let agree = 0;
  setup.claims.forEach((c, i) => {
    const m = marks[claimKey(setup.id, i)];
    if (!m) return;
    marked += 1;
    if (m === 'supported') supportedByLearner += 1;
    if ((m === 'supported') === c.supported) agree += 1;
  });
  const total = setup.claims.length;
  return {
    total,
    marked,
    supportedByLearner,
    faithfulness: marked ? supportedByLearner / marked : NaN,
    reference: setup.claims.filter((c) => c.supported).length / total,
    agree,
    trueInWorld: setup.claims.filter((c) => c.world === 'true').length,
    falseInWorld: setup.claims.filter((c) => c.world === 'false').length,
  };
}

/**
 * Expected score of answering instead of saying "I don't know", under the scoring rule discussed by
 * Kalai et al. (2025): +1 for a correct answer, 0 for "I don't know", and a penalty of t / (1 - t)
 * for a wrong one. With p the chance the answer is right, answering is worth it exactly when p > t.
 */
export function expectedAnswerScore(p: number, t: number): number {
  return p - (1 - p) * (t / (1 - t));
}
