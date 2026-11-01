import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "build-d" batch. */
export const extrasW4BuildD: Record<string, Extra> = {
  'systems/ux-for-ai-features': {
    takeaways: [
      'Streaming does not speed up the model. It puts the first words on screen sooner and, when reading is slower than writing, shortens the whole task by the generation time.',
      'A citation is a promise that a claim can be checked. Build links from your own retrieved passages, verify quoted text in code, and land the user on the supporting sentence.',
      'Uncertainty cues work only when they are calibrated and point at something the user can do. A generic disclaimer changes little and a badly calibrated flag gives false comfort.',
      'Make correction cheaper than regeneration, collect feedback you can trace to a request, and measure task time and error escapes, not only acceptance.',
    ],
    prereq: ['systems/llm-app-system-design'],
    quiz: [
      {
        q: 'A model takes 1.8 s to start and then writes for 4.0 s. A reader needs 30 s to read the result. What does streaming change?',
        options: ['It makes the model write faster', 'Text appears from 1.8 s instead of 5.8 s, and the reader also finishes about 4.0 s sooner', 'It removes the need to check the answer', 'It makes the answer more accurate'],
        answer: 1,
        why: 'Streaming moves the first useful text earlier. Because reading is slower than writing, the saving carries through to the end of the task.',
      },
      {
        q: 'Which design gives the most honest citations?',
        options: ['Let the model type each URL from memory', 'Put every citation in a footer', 'Add more citations to each sentence', 'Build links from retrieved passage IDs and check in code that any quoted text occurs in the source'],
        answer: 3,
        why: 'A link the model typed can be invented. Links built from your own retrieved passages, with quotes checked, can be verified.',
      },
      {
        q: 'Why should the container that receives streamed tokens not be an aria-live region?',
        options: ['Assistive technology may announce fragments as they arrive, so use aria-busy and a separate short status message', 'Live regions do not work in any browser', 'WCAG forbids streaming text', 'It would hide the text from sighted users'],
        answer: 0,
        why: 'A separate status such as "Summary ready" announces the change once, and the finished text stays reachable by ordinary reading.',
      },
      {
        q: 'Which number does a high acceptance rate hide?',
        options: ['Time to first token', 'The number of users', 'Errors in accepted output, found by a sampled audit', 'The size of the page'],
        answer: 2,
        why: 'People can accept output without checking it. Sampled audits of accepted outputs measure the errors that escape.',
      },
    ],
  },
  'systems/human-in-the-loop-design': {
    takeaways: [
      'Pick the pattern for each action by its reversibility and harm: a gate before, an undo window after, a random audit, or a handoff. Enforce the tiers in code, not in the prompt.',
      'Bind each approval to the exact action, let it expire, default to safe when nobody answers, and show the reviewer the effect and the evidence.',
      'A confidence score is useful for ranking before it is trustworthy as a number. Measure observed error rates in score bands on labelled data and redo it when anything changes.',
      'A review queue is a capacity problem: load above 100% never clears. Audit a random slice of what you do not review, and feed every override into your evals.',
    ],
    prereq: ['rag-agents/agents-and-tool-use'],
    quiz: [
      {
        q: 'Why should an approval be bound to the exact tool call and its arguments?',
        options: ['It makes approvals faster', 'So the agent cannot change the action after a person approved a different one', 'Because models cannot read approvals', 'It saves tokens'],
        answer: 1,
        why: 'If the approval is only "refund order 48213", the agent could change the amount afterwards. A bound approval covers one specific call, once.',
      },
      {
        q: 'In the example table, error rates rise with the score band, but the stated risks add up to 110.5 expected errors and there were 150. What follows?',
        options: ['Throw the score away', 'Trust the stated risk numbers', 'Raise every threshold', 'Route on the ranking, but measure observed rates before quoting an error rate'],
        answer: 3,
        why: 'The ordering is useful for routing. The numbers are too low, so a dashboard built on them would under-predict the errors.',
      },
      {
        q: '480 drafts in a shift all go to review. There are 2 reviewers on 480 minutes each and a review takes 3 minutes. What is the load?',
        options: ['50%', '75%', '150%', '300%'],
        answer: 2,
        why: '480 x 3 / (2 x 480) = 1.5. Above 100% the queue cannot clear, so 160 drafts are still waiting at the end.',
      },
      {
        q: 'Roughly how many auto-approved items must you sample to estimate a 2% error rate to within one percentage point at 95% confidence?',
        options: ['About 750', 'About 20', 'About 75', 'About 7,500'],
        answer: 0,
        why: '1.96 squared x 0.02 x 0.98 / 0.01 squared is about 753, using the normal approximation.',
      },
    ],
  },
};
