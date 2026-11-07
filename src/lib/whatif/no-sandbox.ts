/**
 * What if agent-written code runs directly on your machine?
 *
 * A conceptual, defensive illustration. A made-up developer laptop has a small file tree. A coding agent writes a
 * command to "delete files older than 7 days" in the build folder, but a bug in the path it worked out makes the
 * target the whole home folder. Whether that is a small mess or a disaster depends on what the process is allowed
 * to touch. Without isolation it can do whatever your own account can. In a sandbox it gets a short permission list.
 * All paths, counts and host names are made up. There is no exploit content here, and the command is described in
 * words rather than written out.
 */

export type Access = 'none' | 'read' | 'write';

export type Node = {
  path: string;
  depth: number;
  label: string;
  /** Files inside (example). */
  files: number;
  /** Files older than 7 days (example): what the buggy cleanup would delete. */
  old: number;
  /** A short plain description. */
  what: string;
  /** Holds secrets (made-up key and token files). */
  secret?: boolean;
};

export const HOME = '/home/dev';
export const PROJECT = '/home/dev/project';

export const TREE: Node[] = [
  { path: '/home/dev', depth: 0, label: '/home/dev', files: 0, old: 0, what: 'your home folder' },
  { path: '/home/dev/project/build', depth: 2, label: 'project/build', files: 340, old: 310, what: 'build output: what the agent meant to clean' },
  { path: '/home/dev/project/src', depth: 2, label: 'project/src', files: 96, old: 70, what: 'source code (kept in version control)' },
  { path: '/home/dev/photos', depth: 1, label: 'photos', files: 1840, old: 1795, what: 'family photos' },
  { path: '/home/dev/invoices', depth: 1, label: 'invoices', files: 212, old: 190, what: 'invoices and tax papers' },
  { path: '/home/dev/.ssh', depth: 1, label: '.ssh', files: 3, old: 3, what: 'made-up key files', secret: true },
  { path: '/home/dev/.config/tool', depth: 2, label: '.config/tool', files: 2, old: 2, what: 'a made-up access token file', secret: true },
  { path: '/etc', depth: 0, label: '/etc', files: 600, old: 590, what: 'system settings' },
  { path: '/usr', depth: 0, label: '/usr', files: 9000, old: 8800, what: 'installed programs' },
];

export type Rule = { path: string; access: Access };

/** Without isolation the process is you: it gets whatever the operating system lets your account do. */
export const OPEN_RULES: Rule[] = [
  { path: '/home/dev', access: 'write' },
  { path: '/etc', access: 'read' },
  { path: '/usr', access: 'read' },
];

export type Extra = 'nothing' | 'home-read' | 'home-write';

export const EXTRA_LABEL: Record<Extra, string> = {
  nothing: 'Project only',
  'home-read': 'Plus read home',
  'home-write': 'Plus write home',
};

/** The sandbox's permission list: the project folder and read-only programs, plus an optional wider rule. */
export function sandboxRules(extra: Extra): Rule[] {
  const rules: Rule[] = [
    { path: PROJECT, access: 'write' },
    { path: '/usr', access: 'read' },
  ];
  if (extra === 'home-read') rules.push({ path: HOME, access: 'read' });
  if (extra === 'home-write') rules.push({ path: HOME, access: 'write' });
  return rules;
}

const isUnder = (path: string, root: string): boolean => path === root || path.startsWith(root + '/');

/** The most specific rule wins. No matching rule means no access. */
export function accessFor(path: string, rules: Rule[]): Access {
  let best: Rule | null = null;
  for (const r of rules) {
    if (isUnder(path, r.path) && (best === null || r.path.length > best.path.length)) best = r;
  }
  return best ? best.access : 'none';
}

export type Host = { name: string; what: string };

export const HOSTS: Host[] = [
  { name: 'registry.example.org', what: 'package registry the project needs' },
  { name: 'wiki.corp.example', what: 'internal company wiki' },
  { name: 'files.unknown.example', what: 'a server nobody has vetted' },
];

export type NetRules = { allow: string[] | 'all' };

export const reachableHosts = (isolated: boolean): Host[] => (isolated ? HOSTS.filter((h) => h.name === 'registry.example.org') : HOSTS);

/** The folder the buggy cleanup was pointed at, by mistake. It was meant to be the build folder. */
export const TARGET = HOME;

export type Row = { node: Node; access: Access; /** The cleanup would delete this many files here. */ deleted: number; /** The cleanup was refused here. */ refused: number };

export type Outcome = {
  rows: Row[];
  /** Files the command deletes. */
  deleted: number;
  /** Files it would have deleted but the system refused. */
  refused: number;
  writable: number;
  readable: number;
  secretsReadable: number;
  hosts: Host[];
};

export function rulesFor(isolated: boolean, extra: Extra): Rule[] {
  return isolated ? sandboxRules(extra) : OPEN_RULES;
}

/** Plays the buggy cleanup against a permission list. Only folders under TARGET are in its way. */
export function runCommand(isolated: boolean, extra: Extra = 'nothing'): Outcome {
  const rules = rulesFor(isolated, extra);
  const rows: Row[] = TREE.map((node) => {
    const access = accessFor(node.path, rules);
    const inScope = isUnder(node.path, TARGET);
    const candidates = inScope ? node.old : 0;
    const ok = access === 'write';
    return { node, access, deleted: ok ? candidates : 0, refused: ok ? 0 : candidates };
  });
  const content = rows.filter((r) => r.node.files > 0);
  return {
    rows,
    deleted: rows.reduce((n, r) => n + r.deleted, 0),
    refused: rows.reduce((n, r) => n + r.refused, 0),
    writable: content.filter((r) => r.access === 'write').length,
    readable: content.filter((r) => r.access !== 'none').length,
    secretsReadable: content.filter((r) => r.node.secret && r.access !== 'none').length,
    hosts: reachableHosts(isolated),
  };
}

/** Files under the target that the cleanup could ever delete (the worst case). */
export const worstCase = (): number => TREE.filter((n) => isUnder(n.path, TARGET)).reduce((s, n) => s + n.old, 0);

/** What the command was meant to delete: the old files in the build folder. */
export const intended = (): number => TREE.find((n) => n.path === '/home/dev/project/build')!.old;

export const contentFolders = TREE.filter((n) => n.files > 0).length;
