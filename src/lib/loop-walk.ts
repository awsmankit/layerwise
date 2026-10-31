/**
 * The steps of a short Python program that averages a list, one line at a time, for the
 * LoopWalk picture. Each step says which line has just run and what every variable holds.
 */
export const LOOP_CODE = ['scores = [72, 85, 90, 64]', 'total = 0', 'for score in scores:', '    total = total + score', 'average = total / len(scores)', 'print(average)'];

export type LoopStep = {
  /** Index into LOOP_CODE of the line that has just run. */
  line: number;
  /** Which box of the list `score` is pointing at, or null. */
  box: number | null;
  vars: { total?: number; score?: number; average?: number };
  printed?: string;
  note: string;
};

export function loopSteps(values: number[]): LoopStep[] {
  const steps: LoopStep[] = [
    { line: 0, box: null, vars: {}, note: `Python makes a list of ${values.length} numbers and gives it the name scores.` },
    { line: 1, box: null, vars: { total: 0 }, note: 'It makes a variable called total and sets it to 0, like an empty tally.' },
  ];
  let total = 0;
  values.forEach((v, i) => {
    steps.push({ line: 2, box: i, vars: { total, score: v }, note: `The loop takes box ${i} off the shelf. score is now ${v}.` });
    total += v;
    steps.push({ line: 3, box: i, vars: { total, score: v }, note: `total becomes its old value plus ${v}, which is ${total}.` });
  });
  const average = total / values.length;
  steps.push({ line: 4, box: null, vars: { total, average }, note: `The shelf is finished. ${total} divided by ${values.length} boxes is ${average}.` });
  steps.push({ line: 5, box: null, vars: { total, average }, printed: String(average), note: `print shows the answer: ${average}.` });
  return steps;
}
