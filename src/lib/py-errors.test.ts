import { describe, expect, it } from 'vitest';
import { parsePyError } from './py-errors';

const trace = (body: string) => `Traceback (most recent call last):
  File "/lib/python312.zip/_pyodide/_base.py", line 574, in eval_code_async
    await CodeRunner(
  File "<exec>", line 3, in <module>
${body}`;

describe('parsePyError', () => {
  it('reads a NameError and its line', () => {
    const p = parsePyError(trace("NameError: name 'mesage' is not defined"));
    expect(p).toMatchObject({ kind: 'NameError', message: "name 'mesage' is not defined", line: 3 });
    expect(p.explain).toMatch(/spelling/);
  });
  it('subtracts hidden setup lines, and gives no line when the error is inside the setup', () => {
    expect(parsePyError(trace('ZeroDivisionError: division by zero'), 2).line).toBe(1);
    expect(parsePyError(trace('ZeroDivisionError: division by zero'), 3).line).toBeNull();
  });
  it('uses the innermost line of the learner code for errors inside functions', () => {
    const raw = `Traceback (most recent call last):
  File "<exec>", line 8, in <module>
  File "<exec>", line 3, in average
ZeroDivisionError: division by zero`;
    expect(parsePyError(raw).line).toBe(3);
  });
  it('reads a SyntaxError that has no traceback frames', () => {
    const raw = `  File "<exec>", line 1
    print("hi
          ^
SyntaxError: unterminated string literal (detected at line 1)`;
    expect(parsePyError(raw)).toMatchObject({ kind: 'SyntaxError', line: 1 });
  });
  it('copes with an empty or odd message', () => {
    expect(parsePyError('').kind).toBe('Error');
    expect(parsePyError('KeyboardInterrupt').kind).toBe('KeyboardInterrupt');
  });
});
