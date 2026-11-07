import { describe, expect, it } from 'vitest';
import { OPEN_RULES, TREE, accessFor, contentFolders, intended, reachableHosts, runCommand, sandboxRules, worstCase } from './no-sandbox';

describe('no-sandbox', () => {
  it('the most specific rule wins and unlisted paths get no access', () => {
    const rules = sandboxRules('nothing');
    expect(accessFor('/home/dev/project/build', rules)).toBe('write');
    expect(accessFor('/home/dev/photos', rules)).toBe('none');
    expect(accessFor('/usr', rules)).toBe('read');
    expect(accessFor('/etc', rules)).toBe('none');
    expect(accessFor('/home/devious', sandboxRules('home-write'))).toBe('none'); // not a child of /home/dev
    // a broad rule plus a narrower one: the narrower wins
    expect(accessFor('/home/dev/project/src', [{ path: '/home/dev', access: 'read' }, { path: '/home/dev/project', access: 'write' }])).toBe('write');
  });

  it('the worst case and the intended case add up by hand', () => {
    // build 310 + src 70 + photos 1795 + invoices 190 + .ssh 3 + .config/tool 2
    expect(worstCase()).toBe(2370);
    expect(intended()).toBe(310);
  });

  it('without isolation the mistake deletes everything your account can reach', () => {
    const o = runCommand(false);
    expect(o.deleted).toBe(2370);
    expect(o.refused).toBe(0);
    expect(o.secretsReadable).toBe(2);
    expect(o.hosts).toHaveLength(3);
    expect(o.writable).toBe(6);
    expect(accessFor('/usr', OPEN_RULES)).toBe('read'); // the operating system already protects programs from you
  });

  it('in a sandbox the same mistake stays inside the project', () => {
    const o = runCommand(true, 'nothing');
    expect(o.deleted).toBe(310 + 70);
    expect(o.refused).toBe(2370 - 380);
    expect(o.writable).toBe(2);
    expect(o.secretsReadable).toBe(0);
    expect(o.hosts.map((h) => h.name)).toEqual(['registry.example.org']);
    expect(o.deleted + o.refused).toBe(worstCase());
  });

  it('reading the home folder does not allow deleting, but exposes secrets', () => {
    const o = runCommand(true, 'home-read');
    expect(o.deleted).toBe(380);
    expect(o.secretsReadable).toBe(2);
    expect(o.readable).toBeGreaterThan(runCommand(true, 'nothing').readable);
  });

  it('a wide write rule brings the whole disaster back', () => {
    expect(runCommand(true, 'home-write').deleted).toBe(runCommand(false).deleted);
  });

  it('the blast radius never shrinks as the sandbox rule widens', () => {
    const d = (['nothing', 'home-read', 'home-write'] as const).map((e) => runCommand(true, e).deleted);
    expect(d[0]).toBeLessThanOrEqual(d[1]);
    expect(d[1]).toBeLessThanOrEqual(d[2]);
    expect(reachableHosts(true).length).toBeLessThan(reachableHosts(false).length);
    expect(contentFolders).toBe(TREE.filter((n) => n.files > 0).length);
  });
});
