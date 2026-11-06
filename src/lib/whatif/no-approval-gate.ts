/**
 * What if an agent can act without asking a person? A scripted run of a toy agent that is asked to
 * summarise a shared document. The document contains a line, written by someone else, that tells the
 * agent to delete a backup folder. The agent cannot tell that line from your instructions.
 * An approval gate pauses any action that cannot be undone and waits for a person.
 * This is a conceptual illustration for defenders. The planted line is described, not written out.
 */

export type Risk = 'read' | 'reversible' | 'irreversible';

export type Action = {
  id: string;
  label: string;
  risk: Risk;
  /** Plain words a person would see in an approval request. */
  plain: string;
  /** Who asked for it: you, or text found inside the document. */
  source: 'you' | 'document';
};

export const BACKUP = { folder: 'backups/2026', files: 42, gb: 3.1 } as const;

/** The three actions the agent decides to take, in order. */
export const actions: Action[] = [
  { id: 'read', label: 'Read the document', risk: 'read', plain: 'Open report.docx and read it.', source: 'you' },
  { id: 'write', label: 'Save a summary', risk: 'reversible', plain: 'Write summary.txt (the old version is kept).', source: 'you' },
  {
    id: 'delete',
    label: `Delete ${BACKUP.folder}`,
    risk: 'irreversible',
    plain: `Permanently delete ${BACKUP.files} files (${BACKUP.gb} GB) in ${BACKUP.folder}. There is no undo.`,
    source: 'document',
  },
];

/** The gate rule: anything that cannot be undone waits for a person. Reads and undoable writes go straight through. */
export function needsApproval(a: Action): boolean {
  return a.risk === 'irreversible';
}

export type Outcome = 'ran' | 'paused' | 'denied';
export type Decision = 'pending' | 'deny' | 'approve';
export type Step = { action: Action; outcome: Outcome };

export type Run = {
  steps: Step[];
  filesLeft: number;
  /** Actions held back by the gate (waiting or denied). */
  held: number;
  deleted: boolean;
};

/**
 * Plays the scripted run. With the gate on, an irreversible action waits for a person. `decision` is what
 * the person did: nothing yet, deny, or approve. With the gate off there is nobody to ask, so everything runs.
 */
export function runAgent(gate: boolean, decision: Decision = 'pending'): Run {
  const steps: Step[] = actions.map((action) => {
    if (!gate || !needsApproval(action)) return { action, outcome: 'ran' as const };
    const outcome: Outcome = decision === 'approve' ? 'ran' : decision === 'deny' ? 'denied' : 'paused';
    return { action, outcome };
  });
  const deleted = steps.some((s) => s.action.id === 'delete' && s.outcome === 'ran');
  return {
    steps,
    filesLeft: deleted ? 0 : BACKUP.files,
    held: steps.filter((s) => s.outcome !== 'ran').length,
    deleted,
  };
}

/** How many of the run's actions needed a person to look. */
export function interruptions(): number {
  return actions.filter(needsApproval).length;
}

/** Beats of the story for the stepper: 0 ask, 1 read, 2 the document's text enters context, 3 the agent decides, 4 result. */
export const BEATS = 5;
