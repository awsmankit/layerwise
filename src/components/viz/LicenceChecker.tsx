import { useMemo, useState } from 'react';
import { Root } from './shared';
import { DATASETS, MODELS, USES, check, counts, verdict, type DatasetId, type ModelId, type Status, type UseId } from '../../lib/licence-check';

/*
 * Licence checker. Pick a dataset licence, a base-model licence and a use, and see which clauses to read.
 * Not legal advice: it knows only the clauses listed in lib/licence-check.ts.
 */

const MARK: Record<Status, string> = { ok: 'No obstacle found', check: 'Check this', stop: 'Appears ruled out' };
const GLYPH: Record<Status, string> = { ok: '✓', check: '?', stop: '×' };

export default function LicenceChecker() {
  const [dataset, setDataset] = useState<DatasetId>('cc-by-sa');
  const [model, setModel] = useState<ModelId>('llama33');
  const [use, setUse] = useState<UseId>('publish');
  const [synthetic, setSynthetic] = useState(false);

  const findings = useMemo(() => check({ dataset, model, use, synthetic }), [dataset, model, use, synthetic]);
  const v = verdict(findings);
  const c = counts(findings);
  const dset = DATASETS.find((d) => d.id === dataset)!;
  const mset = MODELS.find((m) => m.id === model)!;

  return (
    <Root>
      <div className="viz wrb-lic">
        <p className="viz-title">Can I? A licence checker for one invented project</p>
        <p className="wrb-note">
          The project: fine-tune a base model on a dataset. Pick the licences and the use. This is not legal advice. It knows only the clauses named under each result, read on 1 November 2026, and it cannot tell you whether a trained model counts as a copy or an adaptation of its training data, because the licence texts do not say.
        </p>

        <div className="wrb-lic-grid">
          <label className="field">
            <span>Dataset licence</span>
            <select className="wrb-select" value={dataset} onChange={(e) => setDataset(e.target.value as DatasetId)}>
              {DATASETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            <small className="wrb-small">{dset.note}</small>
          </label>
          <label className="field">
            <span>Base model licence</span>
            <select className="wrb-select" value={model} onChange={(e) => setModel(e.target.value as ModelId)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <small className="wrb-small">{mset.note}</small>
          </label>
        </div>

        <div className="wrb-group" role="group" aria-label="What you want to do">
          <span className="wrb-label">What you want to do</span>
          <div className="wrb-row">
            {USES.map((u) => (
              <button key={u.id} type="button" className="btn quiet" aria-pressed={use === u.id} onClick={() => setUse(u.id)}>
                {u.label}
              </button>
            ))}
          </div>
          <div className="wrb-row">
            <button type="button" className="btn quiet" aria-pressed={synthetic} onClick={() => setSynthetic(!synthetic)}>
              Also train another model on this model's outputs: {synthetic ? 'yes' : 'no'}
            </button>
          </div>
        </div>

        <div className={`wrb-verdict wrb-v-${v.status}`} role="status" aria-live="polite">
          <p>
            <b>
              {c.stop} appear ruled out, {c.check} to check, {c.ok} without obstacle.
            </b>{' '}
            {v.text}
          </p>
        </div>

        <ul className="wrb-findings">
          {findings.map((f, i) => (
            <li key={i} className={`wrb-f wrb-f-${f.status}`}>
              <span className="wrb-glyph" aria-hidden="true">{GLYPH[f.status]}</span>
              <div>
                <p className="wrb-f-title">
                  <span className="wrb-tag">{MARK[f.status]}</span> {f.title}
                  <span className="wrb-about">{f.about === 'both' ? 'dataset and model' : f.about}</span>
                </p>
                <p className="wrb-f-detail">{f.detail}</p>
                <p className="wrb-f-basis">Based on: {f.basis}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="viz-cap">
          Licence versions differ, and a licence cannot give you rights its owner did not have. Where the result says "check", the useful step is to read that clause in the version you actually hold and ask the person responsible for legal questions.
        </p>
      </div>
    </Root>
  );
}
