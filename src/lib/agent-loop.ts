/**
 * A scripted agent run for the "What is an AI agent?" lesson. The task is to
 * find a time for a meeting with three busy friends. Calendars, names and
 * times are made-up examples. There is no model: the steps are written by hand
 * so the learner can see the think, act, look loop and the "ask a person" step.
 */
export type Kind = 'think' | 'act' | 'see' | 'ask';
export type Choice = 'send' | 'ask';

export const SLOTS = ['Sat 10:00', 'Sat 14:00', 'Sun 10:00', 'Sun 14:00'] as const;
export type Slot = (typeof SLOTS)[number];

export const FRIENDS = ['Asha', 'Ben', 'Chloe'] as const;
export type Friend = (typeof FRIENDS)[number];

/** Free slots as the calendar tool shows them. */
export const CALENDARS: Record<Friend, Slot[]> = {
  Asha: ['Sat 10:00', 'Sat 14:00', 'Sun 14:00'],
  Ben: ['Sat 14:00', 'Sun 10:00', 'Sun 14:00'],
  Chloe: ['Sat 14:00', 'Sun 10:00', 'Sun 14:00'],
};

export type Step = {
  kind: Kind;
  text: string;
  /** A friend whose calendar is revealed once this step has happened. */
  reveals?: Friend;
  /** True for the step where the learner must decide. */
  checkpoint?: boolean;
};

export function commonSlots(friends: readonly Friend[] = FRIENDS): Slot[] {
  return SLOTS.filter((s) => friends.every((f) => CALENDARS[f].includes(s)));
}

const list = (slots: Slot[]) => slots.join(', ');

/** The steps before the checkpoint, the same for every run. */
export function openingSteps(): Step[] {
  const steps: Step[] = [
    { kind: 'think', text: 'I need an hour this weekend when Asha, Ben and Chloe are all free. I will read each calendar, one at a time. Asha first.' },
  ];
  for (const f of FRIENDS) {
    if (f !== 'Asha') {
      steps.push({ kind: 'think', text: `Now ${f}. I will keep only the times that everyone so far has free.` });
    }
    steps.push({ kind: 'act', text: `Use the calendar tool: read ${f}’s calendar.` });
    steps.push({ kind: 'see', text: `${f} is free ${list(CALENDARS[f])}.`, reveals: f });
  }
  const both = commonSlots();
  steps.push({
    kind: 'think',
    text: `${list(both)} work for all three. I will pick the earliest, ${both[0]}. Next I would send invites to all three friends. Messages cannot be unsent. Should I ask a person first?`,
  });
  steps.push({ kind: 'ask', text: 'Checkpoint: you are the person in charge. Send the invites now, or ask you first?', checkpoint: true });
  return steps;
}

/** The steps after the learner decides. */
export function endingSteps(choice: Choice): Step[] {
  const both = commonSlots();
  if (choice === 'ask') {
    return [
      { kind: 'ask', text: `Agent asks you: “I plan to invite everyone for ${both[0]}. Is that all right?”` },
      { kind: 'see', text: 'You reply: “Ben has football on Saturday afternoons. It is not in his calendar. Please use Sunday.”' },
      { kind: 'think', text: `The calendar tool only shows what is written in the calendar. It cannot know about football. I will use ${both[1]} instead.` },
      { kind: 'act', text: `Use the messaging tool: send invites for ${both[1]}.` },
      { kind: 'see', text: 'All three friends said yes. Done, and nobody had to be un-invited.' },
    ];
  }
  return [
    { kind: 'act', text: `Use the messaging tool: send invites for ${both[0]}.` },
    { kind: 'see', text: 'Ben replied: “I cannot come, I have football on Saturday afternoons.” The invite has already reached all three friends.' },
    { kind: 'think', text: 'The calendar did not show the football. I now have to send a correction to everyone, and I cannot take the first message back.' },
    { kind: 'ask', text: 'Lesson: a short question before a step that cannot be undone would have caught this.' },
  ];
}

export function fullScript(choice: Choice): Step[] {
  return [...openingSteps(), ...endingSteps(choice)];
}

/** Index of the checkpoint step in the opening script. */
export function checkpointIndex(): number {
  return openingSteps().findIndex((s) => s.checkpoint);
}

/** Which friends' calendars are visible after `shown` steps of the script have played. */
export function revealedFriends(steps: Step[], shown: number): Friend[] {
  return steps.slice(0, shown).flatMap((s) => (s.reveals ? [s.reveals] : []));
}

/** How many full loops (think, act, see) have finished in the steps shown so far. */
export function loopsDone(steps: Step[], shown: number): number {
  return steps.slice(0, shown).filter((s) => s.kind === 'see').length;
}
