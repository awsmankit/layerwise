/**
 * Turns the text of a Python traceback into the three things a beginner needs: what kind
 * of error it is, what it says, and which line of their own code it points at.
 */
export type PyProblem = {
  kind: string;
  message: string;
  /** The line in the learner's own code, or null when Python did not give one. */
  line: number | null;
  /** One plain-English sentence about this kind of error. */
  explain: string;
};

const EXPLAIN: Record<string, string> = {
  NameError: 'Python met a name it does not know. Check the spelling, and check that you created the variable on an earlier line.',
  SyntaxError: 'Python could not read the line, like a sentence with a missing full stop. Look for a missing bracket, quote or colon.',
  IndentationError: 'The spaces at the start of a line are wrong. Lines inside a loop, an if or a function must be pushed in by the same amount.',
  TabError: 'Tabs and spaces are mixed at the start of lines. Use four spaces.',
  TypeError: 'A value is the wrong kind for what you asked, such as adding text to a number.',
  ValueError: 'The kind of value is right, but this particular value is not allowed.',
  IndexError: 'You asked for a box in a list that does not exist. Counting starts at 0, and the last box is one less than the length.',
  KeyError: 'You looked up a key that is not in the dictionary.',
  ZeroDivisionError: 'You divided by zero. An empty list has length 0, which is a common cause.',
  AttributeError: 'You asked a value for something it does not have, such as a method with the wrong name.',
};

/**
 * `raw` is what Python printed. `lineOffset` is how many lines of hidden setup code were
 * placed before the learner's code, so the reported line matches what they see.
 */
export function parsePyError(raw: string, lineOffset = 0): PyProblem {
  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  const last = [...lines].reverse().find((l) => /^[A-Za-z_][\w.]*(:|$)/.test(l)) ?? lines[lines.length - 1] ?? '';
  const m = last.match(/^([A-Za-z_][\w.]*)(?::\s*(.*))?$/);
  const kind = m ? m[1].split('.').pop()! : 'Error';
  const message = m?.[2] ?? '';
  const nums = [...raw.matchAll(/File "<exec>", line (\d+)/g)].map((x) => Number(x[1]));
  const raw_line = nums.length ? nums[nums.length - 1] - lineOffset : null;
  return { kind, message, line: raw_line !== null && raw_line > 0 ? raw_line : null, explain: EXPLAIN[kind] ?? 'Read the last line: it names the problem. The line number above it says where Python gave up.' };
}
