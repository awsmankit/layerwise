import { describe, expect, it } from 'vitest';
import { isPlainClick, opensInNewTab } from './new-tab';

const page = 'https://awsmankit.github.io/layerwise/start/';

describe('opensInNewTab', () => {
  it('keeps pages on this site in this tab', () => {
    expect(opensInNewTab('/layerwise/learn/start/how-a-chatbot-answers/', page)).toBe(false);
    expect(opensInNewTab('../learn/', page)).toBe(false);
    expect(opensInNewTab('/layerwise/', page)).toBe(false);
    expect(opensInNewTab('https://awsmankit.github.io/layerwise/glossary/', page)).toBe(false);
    expect(opensInNewTab('/layerwise/interview/#roles', page)).toBe(false);
  });

  it('opens other sites in a new tab', () => {
    expect(opensInNewTab('https://github.com/awsmankit/layerwise', page)).toBe(true);
    expect(opensInNewTab('http://example.com', page)).toBe(true);
    expect(opensInNewTab('https://www.youtube.com/watch?v=abc#t=10', page)).toBe(true);
  });

  it('keeps jumps within the page in this tab', () => {
    expect(opensInNewTab('#main', page)).toBe(false);
    expect(opensInNewTab('#student', page)).toBe(false);
    expect(opensInNewTab('/layerwise/start/#student', page)).toBe(false);
    expect(opensInNewTab('https://awsmankit.github.io/layerwise/start/#infra', page)).toBe(false);
    expect(opensInNewTab('#top', `${page}#student`)).toBe(false);
  });

  it('leaves non-web schemes alone', () => {
    expect(opensInNewTab('javascript:void(0)', page)).toBe(false);
    expect(opensInNewTab(' JavaScript:alert(1)', page)).toBe(false);
    expect(opensInNewTab('mailto:someone@example.com', page)).toBe(false);
    expect(opensInNewTab('tel:+441234567890', page)).toBe(false);
    expect(opensInNewTab('blob:https://awsmankit.github.io/abc', page)).toBe(false);
    expect(opensInNewTab('data:text/plain,hi', page)).toBe(false);
  });

  it('leaves empty and broken hrefs alone', () => {
    expect(opensInNewTab('', page)).toBe(false);
    expect(opensInNewTab('   ', page)).toBe(false);
    expect(opensInNewTab(null, page)).toBe(false);
    expect(opensInNewTab(undefined, page)).toBe(false);
    expect(opensInNewTab('http://[bad', page)).toBe(false);
  });
});

describe('isPlainClick', () => {
  const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

  it('accepts a plain left click', () => {
    expect(isPlainClick(plain)).toBe(true);
  });

  it('rejects clicks with a modifier key or another button', () => {
    expect(isPlainClick({ ...plain, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, altKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, button: 1 })).toBe(false);
  });
});
