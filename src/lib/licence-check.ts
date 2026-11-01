/*
 * Licence checker for a scripted project: a dataset licence, a base-model licence and an intended use go in,
 * a list of "things to check" comes out. It is NOT legal advice and it is deliberately modest:
 *   - it only knows the clauses listed below, each taken from the licence text read on 1 November 2026;
 *   - 'stop' means "the clause as written appears to rule this out, so do not proceed without the owner's
 *     permission", 'check' means "a condition applies, or the question is unsettled", 'ok' means "no
 *     obstacle in the clauses this tool knows";
 *   - whether a trained model counts as an "adaptation" or a "derivative database" of its training data is
 *     NOT settled by any of these texts, so those cases are always 'check', never 'ok' or 'stop'.
 * Licences change and have versions. Read the actual text of the version you hold.
 */

export type DatasetId = 'cc0' | 'cc-by' | 'cc-by-sa' | 'cc-by-nc' | 'odbl' | 'cdla-p' | 'research-only' | 'scraped';
export type ModelId = 'apache' | 'mit' | 'llama33' | 'rail' | 'nc-model' | 'api';
export type UseId = 'learn' | 'product' | 'publish';
export type Status = 'ok' | 'check' | 'stop';

export interface Finding {
  id: string;
  about: 'dataset' | 'model' | 'both';
  status: Status;
  title: string;
  detail: string;
  /** Which text the finding rests on. */
  basis: string;
}

export interface Pick {
  dataset: DatasetId;
  model: ModelId;
  use: UseId;
  /** The project also trains another model on this model's outputs. */
  synthetic: boolean;
}

export const DATASETS: { id: DatasetId; label: string; note: string }[] = [
  { id: 'cc0', label: 'CC0 1.0 (public-domain dedication)', note: 'The owner waives rights as far as the law allows.' },
  { id: 'cc-by', label: 'CC BY 4.0', note: 'Attribution.' },
  { id: 'cc-by-sa', label: 'CC BY-SA 4.0', note: 'Attribution and share-alike.' },
  { id: 'cc-by-nc', label: 'CC BY-NC 4.0', note: 'Attribution, non-commercial.' },
  { id: 'odbl', label: 'ODbL 1.0 (Open Database Licence)', note: 'Attribution and share-alike for databases.' },
  { id: 'cdla-p', label: 'CDLA-Permissive-2.0', note: 'A data licence that says it puts no restriction on results.' },
  { id: 'research-only', label: 'A custom "research use only" licence', note: 'Invented example: read its exact words.' },
  { id: 'scraped', label: 'Web pages you scraped yourself (no licence)', note: 'Nothing grants you permission.' },
];

export const MODELS: { id: ModelId; label: string; note: string }[] = [
  { id: 'apache', label: 'Apache License 2.0', note: 'Permissive, with notice duties.' },
  { id: 'mit', label: 'MIT License', note: 'Permissive, keep the notice.' },
  { id: 'llama33', label: 'Llama 3.3 Community License (6 Dec 2024)', note: 'Custom licence with extra terms. Other Llama versions differ.' },
  { id: 'rail', label: 'BigScience RAIL v1.0 (an OpenRAIL-style licence)', note: 'Use restrictions that must be passed on.' },
  { id: 'nc-model', label: 'A non-commercial model licence', note: 'Invented example: weights for non-commercial use only.' },
  { id: 'api', label: 'A hosted model behind an API', note: 'You hold no weights, only the provider terms.' },
];

export const USES: { id: UseId; label: string }[] = [
  { id: 'learn', label: 'A learning or school project, results not shared' },
  { id: 'product', label: 'A commercial product or paid service (weights stay private)' },
  { id: 'publish', label: 'Publishing the fine-tuned weights for anyone to download' },
];

const CC_FAQ = 'Creative Commons FAQ on text and data mining';

function datasetFindings(d: DatasetId, use: UseId): Finding[] {
  const f = (status: Status, title: string, detail: string, basis: string): Finding => ({ id: `d-${d}-${use}-${title.length}`, about: 'dataset', status, title, detail, basis });
  switch (d) {
    case 'cc0':
      return [
        f('ok', 'The owner has waived their rights', 'CC0 says the owner waives copyright and related rights as far as the law allows, for any purpose including commercial.', 'CC0 1.0, Waiver'),
        f('check', 'The label is only as good as the person who applied it', 'CC0 says the owner disclaims responsibility for clearing other people\'s rights in the work. If someone uploaded material they did not own, a CC0 label does not fix that. Check where the data really came from.', 'CC0 1.0, Limitations and Disclaimers'),
      ];
    case 'cc-by':
      return [
        use === 'learn'
          ? f('ok', 'Private use, nothing shared', 'The CC BY 4.0 conditions apply when you Share the licensed material. Using it privately to learn carries no attribution duty in the text.', 'CC BY 4.0, Section 3(a)')
          : f('check', 'Attribution', 'If you Share the licensed material (including modified), you must keep the creator, notice and licence information. If you publish weights or data, decide whether you are sharing licensed material, and credit the sources to be safe.', 'CC BY 4.0, Section 3(a)'),
        f('check', 'Is a trained model an "adaptation"?', 'Neither the licence nor the CC FAQ says whether model weights count as Adapted Material. CC says that where an exception or limitation applies to your use (for example a text-and-data-mining exception), the licence does not apply at all.', `CC BY 4.0, Section 2(a)(2); ${CC_FAQ}`),
      ];
    case 'cc-by-sa':
      return [
        use === 'learn'
          ? f('ok', 'Private use, nothing shared', 'Share-alike applies if you Share Adapted Material you produce. Nothing shared, nothing triggered.', 'CC BY-SA 4.0, Section 3(b)')
          : f('check', 'Share-alike may reach what you share', 'If what you publicly share qualifies as an adaptation, the adapter\'s licence must be BY-SA or compatible, and you may not add terms that restrict the rights it grants. Whether weights are an adaptation is not answered by the text.', `CC BY-SA 4.0, Section 3(b); ${CC_FAQ}`),
        f('check', 'Is a trained model an "adaptation"?', 'The CC FAQ says that if you share an adaptation of SA material, you must apply the same licence to it, and does not say whether a model is one. Treat this as an open question to put to a lawyer.', CC_FAQ),
      ];
    case 'cc-by-nc':
      return [
        use === 'learn'
          ? f('ok', 'A non-commercial learning project fits', 'NonCommercial means not primarily intended for or directed towards commercial advantage or monetary compensation. A private school project is the textbook case.', 'CC BY-NC 4.0, Section 1')
          : use === 'product'
            ? f('stop', 'Commercial use is what the licence excludes', 'A paid product is directed towards commercial advantage. The CC FAQ says that if you are mining for commercial purposes you should not mine NC-licensed material.', `CC BY-NC 4.0, Section 1; ${CC_FAQ}`)
            : f('check', 'Free publication is not the same as non-commercial downstream', 'Publishing free of charge may be non-commercial on your side, but others could use the weights commercially, and whether NC follows the weights depends on whether they are an adaptation. Ask the data owner.', 'CC BY-NC 4.0, Section 1'),
      ];
    case 'odbl':
      return [
        use === 'learn'
          ? f('ok', 'Private use, nothing published', 'ODbL share-alike and notices apply when you Publicly Use or Publicly Convey a Derivative Database or a Produced Work.', 'ODbL 1.0, Sections 4.2 to 4.4')
          : f('check', 'Share-alike and notice duties', 'A Derivative Database that you Publicly Use must stay under the ODbL or a compatible licence, and a Produced Work that is Publicly Used needs a notice that content came from the database. Whether a model or its answers are either is not settled by the text.', 'ODbL 1.0, Sections 4.3 and 4.4'),
      ];
    case 'cdla-p':
      return [
        f('ok', 'The licence puts no restriction on the results', 'It defines Results as any outcome of computational analysis of the data, "including for example machine learning models", and says it imposes no restriction or obligation on their use, modification or sharing. If you share the data itself you must include the licence text.', 'CDLA-Permissive-2.0, Sections 2.1, 3.1 and 5.4'),
      ];
    case 'research-only':
      return use === 'learn'
        ? [f('check', 'Is your project "research"?', 'A school project may or may not count. Read the exact definition in the licence you hold.', 'A generic example: no real text to cite')]
        : [f('stop', 'Research-only licences exclude products and, usually, redistribution', 'A licence limited to research use does not grant commercial use. If the words say research only, a product or public release needs the owner\'s written permission.', 'A generic example: check the exact words')];
    case 'scraped':
      return [
        f('check', 'No licence means no permission from the owner', 'Copyright still applies to material you can read on the web. Whether training on it is allowed depends on exceptions and fair use, which differ by country and are still being decided by courts. The lesson above gives the dated state of play.', 'US Copyright Office, Part 3 (pre-publication); court decisions in the lesson'),
        f('check', 'Opt-outs, robots.txt and site terms', 'In the EU, a rights holder can reserve rights from text-and-data mining in a machine-readable way, and the AI Act requires providers of general-purpose AI models to have a policy to comply with such reservations. robots.txt is a request that crawlers are asked to honour and is not access authorisation. Check the site terms too.', 'AI Act Article 53(1)(c) and Recital 105; RFC 9309'),
        ...(use === 'learn' ? [] : [f('check', 'Commercial or public release raises the stakes', 'The cases read for the lesson turned on the source of the data, the purpose and the effect on markets. A product or a public release is exactly where those questions bite. Get legal advice before relying on this data.', 'Bartz v. Anthropic, Kadrey v. Meta, Thomson Reuters v. ROSS')]),
      ];
  }
}

function modelFindings(m: ModelId, use: UseId, synthetic: boolean): Finding[] {
  const f = (status: Status, title: string, detail: string, basis: string): Finding => ({ id: `m-${m}-${use}-${title.length}`, about: 'model', status, title, detail, basis });
  const out: Finding[] = [];
  switch (m) {
    case 'apache':
      out.push(
        use === 'publish'
          ? f('check', 'Notice duties when you distribute', 'Give recipients a copy of the licence, mark files you changed, keep notices, and carry over any NOTICE text. You may add your own terms to your modifications.', 'Apache License 2.0, Section 4')
          : f('ok', 'No obstacle for this use', 'Apache 2.0 grants copyright and patent licences for use, modification and distribution. The notice duties apply when you redistribute.', 'Apache License 2.0, Sections 2, 3 and 4'),
      );
      break;
    case 'mit':
      out.push(
        use === 'publish'
          ? f('check', 'Keep the notice', 'The copyright and permission notice must be included in all copies or substantial portions.', 'MIT License')
          : f('ok', 'No obstacle for this use', 'The MIT licence permits use, copying, modification and sale on condition that the notice stays with copies.', 'MIT License'),
      );
      break;
    case 'llama33':
      out.push(
        f('check', 'Acceptable Use Policy applies to every use', 'Use must comply with applicable law and with Meta\'s Acceptable Use Policy, which the licence incorporates by reference. Read the policy for your use.', 'Llama 3.3 Community License, Section 1.b.iv'),
      );
      if (use === 'product') out.push(f('check', 'The 700 million monthly users threshold', 'If your products had more than 700 million monthly active users on the release date, you must ask Meta for a licence. Most teams are far below this, but the clause exists.', 'Llama 3.3 Community License, Section 2'));
      if (use === 'publish') out.push(f('check', 'Naming, attribution and licence copy', 'If you distribute, include a copy of the agreement, display "Built with Llama", keep the Notice text, and start the name of an AI model you train from it with "Llama".', 'Llama 3.3 Community License, Section 1.b'));
      break;
    case 'rail':
      out.push(
        use === 'publish'
          ? f('check', 'Use restrictions must travel with the weights', 'If you distribute the model or derivatives, the use-based restrictions in Attachment A must be an enforceable provision in your own licence, and recipients must be told.', 'BigScience RAIL License v1.0, paragraph 4 and Attachment A')
          : f('check', 'Use-based restrictions apply to your use', 'You cannot use the model or derivatives for the restricted uses in Attachment A, and you must require your own users to comply.', 'BigScience RAIL License v1.0, paragraph 5'),
      );
      break;
    case 'nc-model':
      out.push(
        use === 'learn'
          ? f('ok', 'Non-commercial learning fits', 'A licence limited to non-commercial use allows a private learning project, if its definition matches. Read the exact wording.', 'A generic example: check the exact words')
          : use === 'product'
            ? f('stop', 'A commercial product is outside a non-commercial licence', 'The weights are licensed for non-commercial use only. A paid product needs a separate licence from the owner.', 'A generic example: check the exact words')
            : f('check', 'Redistribution may be limited too', 'Many non-commercial licences restrict redistribution or require the same terms to travel. Read what yours says about derivatives.', 'A generic example: check the exact words'),
      );
      break;
    case 'api':
      if (use === 'publish') out.push(f('stop', 'You do not hold the weights', 'A hosted model gives you answers, not weights. There is no fine-tuned model of this base for you to publish, only whatever the provider lets you export.', 'How hosted APIs work; read the provider terms'));
      else out.push(f('check', 'Provider terms govern the use', 'Your rights come from the provider\'s terms, which differ by vendor and change. Read the current version for your plan, and check data-use and retention terms for the data you send.', 'Provider terms'));
      break;
  }
  if (synthetic) {
    if (m === 'api') out.push(f('check', 'Training another model on its outputs', 'Anthropic\'s Commercial Terms (read 1 November 2026) bar using the services to build a competing product or service, including training competing AI models, and Google\'s Gemini API terms bar using the services to develop models that compete with them. OpenAI\'s terms blocked automated reading, so this tool has not read them. Whether your model competes is the question.', 'Anthropic Commercial Terms D.4; Gemini API Additional Terms'));
    else if (m === 'rail') out.push(f('check', 'A model trained on its outputs is a "Derivative"', 'The RAIL definition of Derivatives of the Model includes other models created by transfer of patterns of the output, including distillation and training on synthetic data generated by the model. The use restrictions then follow.', 'BigScience RAIL License v1.0, definition of Derivatives of the Model'));
    else if (m === 'llama33') out.push(f('check', 'Naming rule for models trained on outputs', 'If you use outputs or results of the Llama Materials to create, train, fine tune or improve an AI model that is distributed or made available, the name of that model must begin with "Llama".', 'Llama 3.3 Community License, Section 1.b.i'));
    else out.push(f('ok', 'No output restriction in this licence text', 'The permissive texts do not restrict training on outputs. Whatever the output was based on may still carry its own terms.', m === 'apache' ? 'Apache License 2.0' : m === 'mit' ? 'MIT License' : 'A generic example'));
  }
  return out;
}

function combinedFindings(p: Pick): Finding[] {
  const out: Finding[] = [];
  const restrictive = p.model === 'llama33' || p.model === 'rail' || p.model === 'nc-model';
  if (p.use === 'publish' && p.dataset === 'cc-by-sa' && restrictive) {
    out.push({
      id: 'c-sa-restrictive',
      about: 'both',
      status: 'check',
      title: 'Share-alike meets a licence with extra terms',
      detail: 'CC BY-SA forbids adding terms that restrict the rights its licence grants to adapted material you share. A base model licence that adds acceptable-use or non-commercial terms may not fit. Whether that clash arises depends on whether the weights are an adaptation, which is open.',
      basis: 'CC BY-SA 4.0, Section 3(b); the model licence',
    });
  }
  if (p.use === 'publish' && p.dataset === 'odbl' && restrictive) {
    out.push({
      id: 'c-odbl-restrictive',
      about: 'both',
      status: 'check',
      title: 'Share-alike meets a licence with extra terms',
      detail: 'A Derivative Database that is Publicly Used must stay under the ODbL or a compatible licence, and added content must not be incompatible with the ODbL. If the weights were a Derivative Database, a model licence with extra terms would be a problem. The text does not say they are.',
      basis: 'ODbL 1.0, Section 4.4',
    });
  }
  return out;
}

export function check(p: Pick): Finding[] {
  return [...datasetFindings(p.dataset, p.use), ...modelFindings(p.model, p.use, p.synthetic), ...combinedFindings(p)];
}

export function verdict(findings: Finding[]): { status: Status; text: string } {
  if (findings.some((x) => x.status === 'stop')) return { status: 'stop', text: 'At least one clause appears to rule this out. Do not go ahead without the owner\'s permission.' };
  if (findings.some((x) => x.status === 'check')) return { status: 'check', text: 'No clause rules it out, but conditions apply or a question is open. Read each item below, then ask the right person.' };
  return { status: 'ok', text: 'No obstacle found in the clauses this tool knows. That is not the same as permission: read the real texts and ask your lawyer.' };
}

export function counts(findings: Finding[]): Record<Status, number> {
  const c: Record<Status, number> = { ok: 0, check: 0, stop: 0 };
  for (const x of findings) c[x.status]++;
  return c;
}
