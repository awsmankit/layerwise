import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "resp-a" batch. */
export const extrasW4RespA: Record<string, Extra> = {
  'responsible/why-did-it-say-that': {
    takeaways: [
      'Decide who the explanation is for first. A person affected needs reasons and a way to contest; a builder needs debugging tools; an auditor needs evidence. Use an interpretable model when it is accurate enough.',
      'Permutation importance shows how much one model leans on a feature on held-out data. Correlated columns share the credit, so each looks less important than it is.',
      'Shapley values split the gap between one prediction and a typical one among the features and always add up, but they are not what-if statements. A counterfactual says what would need to change.',
      'Attention maps, saliency maps and a chatbot\'s own reasons are not guaranteed to reflect what the model did. Test them, and treat mechanistic interpretability as promising research, not a finished audit tool.',
    ],
    prereq: ['foundations/classical-ml-essentials', 'foundations/attention-intuition'],
    quiz: [
      {
        q: 'A model reads two near-identical income columns. You shuffle one and the error barely rises. What should you conclude?',
        options: [
          'Income does not matter to the model',
          'The other column still carries the signal, so permutation importance understates how much the model relies on income',
          'The model is overfitted',
          'Permutation importance cannot be used on regression models',
        ],
        answer: 1,
        why: 'Shuffling one of two correlated columns leaves the other intact, so each looks about half as important. Cluster correlated features or shuffle them together.',
      },
      {
        q: 'In the three-feature example, the baseline score is 50 and Asha scores 53. What must her three Shapley values add up to?',
        options: ['53', '3', '50', '0'],
        answer: 1,
        why: 'Efficiency: the Shapley values add up to the prediction minus the baseline prediction, 53 minus 50.',
      },
      {
        q: 'A paper finds that very different attention distributions can give the same prediction. What follows for using attention weights as explanations?',
        options: [
          'Attention is always the best explanation',
          'Attention weights are random noise',
          'An attention weight is not automatically a reason for the output, so claiming it explains something needs a test',
          'Only recurrent models have attention',
        ],
        answer: 2,
        why: 'Jain and Wallace found this and argued attention should not be treated as explanation by default. Wiegreffe and Pinter replied that the answer depends on the definition of explanation and the test used.',
      },
      {
        q: 'A chatbot explains its answer in fluent steps. Turpin and colleagues biased the prompt so the answer was always (A). What did they find?',
        options: [
          'The explanations always mentioned the bias',
          'The models ignored the bias',
          'The models often followed the bias and gave reasons that did not mention it',
          'Accuracy rose by 36%',
        ],
        answer: 2,
        why: 'Accuracy fell by up to 36% on 13 tasks and the written reasoning rationalised the wrong answers without naming the real influence.',
      },
    ],
  },
  'responsible/running-ai-governance': {
    takeaways: [
      'Governance is a routine, not a document: an inventory of AI systems with owners, risk tiers set from the use, named roles, review gates, monitoring, incident handling and supplier checks.',
      'The NIST AI RMF has four functions, Govern, Map, Measure and Manage. It is voluntary and not a checklist, and as of 1 November 2026 NIST says it is being revised. Its generative-AI profile lists twelve risks.',
      'A model card says what a model is for, what it was tested on, how it does by group and what is untested. Numbers, scope limits and group results separate a useful card from a vague one.',
      'Decide in advance the minimum fields of an incident report and who judges seriousness. The EU AI Act sets its own definition and deadlines for serious incidents, which depend on your role.',
    ],
    prereq: [],
    quiz: [
      {
        q: 'A card says "state-of-the-art accuracy: 98%, tested across diverse users". What is the best response?',
        options: [
          'Trust it: 98% is high',
          'Ask what accuracy means, on what data, which users, and look for results by group and out-of-scope uses',
          'Ignore the card and read the model name only',
          'Assume diverse means it works for every group',
        ],
        answer: 1,
        why: 'The claims have no definition or numbers. A useful card names the metric, the data and the groups and says where it is weaker.',
      },
      {
        q: 'Which of these is NOT one of the four NIST AI RMF functions?',
        options: ['Govern', 'Certify', 'Measure', 'Manage'],
        answer: 1,
        why: 'The functions are Govern, Map, Measure and Manage. NIST describes the framework as voluntary, not a certification.',
      },
      {
        q: 'Why does the lesson say a risk-scoring rubric for incidents is a tool for judgement and not a replacement for it?',
        options: [
          'Because scores are always wrong',
          'Because a rubric cannot know the context, such as a minor harm to a vulnerable person, and cases near a cut-off need people to decide',
          'Because the law forbids scoring incidents',
          'Because only lawyers may triage',
        ],
        answer: 1,
        why: 'A rubric gives consistency and speed. People still need to be able to escalate cases the rubric under-scores.',
      },
      {
        q: 'Under the EU AI Act as shown on 1 November 2026, who does a deployer of a high-risk system inform first on identifying a serious incident?',
        options: ['The press', 'The provider', 'The AI Office only', 'Nobody until an audit'],
        answer: 1,
        why: 'Article 26 says deployers inform the provider first, then the importer or distributor and the market surveillance authorities. Whether it applies to you depends on your role; ask a lawyer.',
      },
    ],
  },
};
