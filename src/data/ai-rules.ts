/*
 * A dated map of how some jurisdictions regulate AI, for responsible/ai-rules-around-the-world.
 *
 * Rules for this file:
 *  - Every filled cell cites at least one primary source (a legislature, government or regulator page, or the
 *    official text of the instrument) that the author read, and the date it was read (`checked`).
 *  - A cell that could not be verified from a primary source is `null`. It is shown as "no verified entry",
 *    never filled from a summary or a law-firm note.
 *  - Text paraphrases the source. It is not legal advice and may be out of date: always read the instrument.
 *  - The `tags` are this site's own simplification, used for the filter. They are not legal categories.
 */

export const CHECKED = '2026-11-01';

export type Source = { label: string; url: string; checked: string };
export type Cell = { text: string; sources: Source[] };

export type FacetId = 'status' | 'providers' | 'deployers' | 'transparency' | 'penalties';
export const FACETS: { id: FacetId; label: string; short: string }[] = [
  { id: 'status', label: 'Instrument and dates', short: 'Instrument and dates' },
  { id: 'providers', label: 'Duties for providers and developers', short: 'Providers' },
  { id: 'deployers', label: 'Duties for deployers, users and platforms', short: 'Deployers' },
  { id: 'transparency', label: 'Transparency, labelling and reporting', short: 'Transparency' },
  { id: 'penalties', label: 'Enforcement and penalties', short: 'Penalties' },
];

export type Tag = 'risk-based' | 'use-specific' | 'developer-transparency' | 'content-labelling' | 'voluntary' | 'promotion' | 'filing';
export const TAGS: { id: Tag; label: string; gloss: string }[] = [
  { id: 'risk-based', label: 'Risk-based', gloss: 'Duties grow with the risk of the use or the system.' },
  { id: 'use-specific', label: 'Use-specific', gloss: 'Rules aimed at named uses or harms, such as decisions about people or banned intents.' },
  { id: 'developer-transparency', label: 'Developer transparency', gloss: 'Large developers must publish safety information or report incidents.' },
  { id: 'content-labelling', label: 'Content labelling', gloss: 'AI-generated content must be marked or disclosed.' },
  { id: 'voluntary', label: 'Voluntary or principles', gloss: 'Guidance and principles, not binding duties of their own.' },
  { id: 'promotion', label: 'Promotion framework', gloss: 'A law mainly setting plans, institutions and policy goals.' },
  { id: 'filing', label: 'Filing and assessment', gloss: 'Services must be assessed or registered with an authority.' },
];

export type Jurisdiction = {
  id: string;
  name: string;
  tags: Tag[];
  cells: Record<FacetId, Cell | null>;
};

const S = (label: string, url: string): Source => ({ label, url, checked: CHECKED });
const cell = (text: string, ...sources: Source[]): Cell => ({ text, sources });

/* ---------- sources ---------- */

const EU_TIMELINE = S('AI Act Service Desk: timeline for the implementation of the EU AI Act', 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act');
const EU_FRAMEWORK = S('European Commission: AI Act, regulatory framework (application timeline and AI Omnibus)', 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai');
const EU_A16 = S('AI Act Article 16: obligations of providers of high-risk AI systems', 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-16');
const EU_A26 = S('AI Act Article 26: obligations of deployers of high-risk AI systems', 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-26');
const EU_A50 = S('AI Act Article 50: transparency obligations for providers and deployers of certain AI systems', 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50');
const EU_A99 = S('AI Act Article 99: penalties', 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-99');

const US_EO = S('White House: Executive Order 14365, Ensuring a National Policy Framework for Artificial Intelligence (11 December 2025)', 'https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/');
const US_NIST = S('NIST: AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework');
const US_TAKEDOWN = S('Public Law 119-12, TAKE IT DOWN Act (19 May 2025), text on govinfo.gov', 'https://www.govinfo.gov/content/pkg/PLAW-119publ12/html/PLAW-119publ12.htm');

const CO_ACT = S('Colorado Senate Bill 26-189, signed act (PDF on the Colorado General Assembly site)', 'https://leg.colorado.gov/bill_files/116489/download');
const CO_BILL = S('Colorado General Assembly: SB26-189 Automated Decision-Making Technology (bill page)', 'https://leg.colorado.gov/bills/sb26-189');

const CA_GOV = S('Governor of California: press release on signing SB 53 (29 September 2025)', 'https://www.gov.ca.gov/2025/09/29/governor-newsom-signs-sb-53-advancing-californias-world-leading-artificial-intelligence-industry/');

const TX_TEXT = S('Texas HB 149 (89th Legislature), enrolled text', 'https://capitol.texas.gov/tlodocs/89R/billtext/html/HB00149F.htm');
const TX_HISTORY = S('Texas Legislature Online: HB 149 bill history', 'https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149');

const UK_WHITE = S('GOV.UK: A pro-innovation approach to AI regulation (white paper, updated 3 August 2023)', 'https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper');
const UK_OCT = S('GOV.UK: Britain steps up national defences against growing AI risks (12 October 2026)', 'https://www.gov.uk/government/news/britain-steps-up-national-defences-against-growing-ai-risks');

const IN_GUIDE = S('MeitY: India AI Governance Guidelines (PDF hosted by the Press Information Bureau, released 5 November 2025)', 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc2025115685601.pdf');
const IN_PIB = S('Press Information Bureau: MeitY unveils India AI Governance Guidelines (5 November 2025)', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2186639');
const IN_RULES = S('MeitY: IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, consolidated as updated on 10 February 2026', 'https://www.meity.gov.in/static/uploads/2026/03/0b576f2071694b52e4cd6bb1b6dfab1e.pdf');

const CN_GEN = S('Cyberspace Administration of China: Interim Measures for the Management of Generative AI Services (in Chinese)', 'https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm');
const CN_LABEL = S('Cyberspace Administration of China: Measures for Labeling AI-Generated Synthetic Content, notice 国信办通字〔2025〕2号 (in Chinese)', 'https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm');

const KR_MSIT = S('Ministry of Science and ICT (Korea): Basic Act on AI passed at the National Assembly plenary session (press release, December 2024)', 'https://www.msit.go.kr/eng/bbs/view.do?sCode=eng&mId=4&mPid=2&pageIndex=&bbsSeqNo=42&nttSeqNo=1071&searchOpt=ALL&searchTxt=');
const KR_A31 = S('Korean Law Information Center: AI Framework Act, Article 31 (in Korean)', 'https://law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031810723');
const KR_A43 = S('Korean Law Information Center: AI Framework Act, Article 43 (in Korean)', 'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1031810927');

const JP_ACT = S('Japanese Law Translation: Act on Promotion of Research and Development, and Utilization of AI-related Technology (Act No. 53 of 2025)', 'https://www.japaneselawtranslation.go.jp/en/laws/view/5066/en');
const JP_OUTLINE = S('Cabinet Office (Japan): outline of the AI Act', 'https://www8.cao.go.jp/cstp/ai/ai_hou_gaiyou_en.pdf');

const OECD = S('OECD.AI: OECD AI Principles overview', 'https://oecd.ai/en/ai-principles');

/* ---------- the map ---------- */

export const JURISDICTIONS: Jurisdiction[] = [
  {
    id: 'eu',
    name: 'European Union',
    tags: ['risk-based', 'content-labelling'],
    cells: {
      status: cell(
        'The AI Act entered into force on 1 August 2024 and applies in stages. Prohibitions and AI literacy since 2 February 2025; general-purpose AI model rules since 2 August 2025; most other rules and enforcement from 2 August 2026; new bans on non-consensual sexual deepfakes and child sexual abuse material from 2 December 2026. High-risk rules for Annex III uses apply from 2 December 2027 and for AI built into regulated products from 2 August 2028, after the AI Omnibus (in force 27 July 2026).',
        EU_TIMELINE,
        EU_FRAMEWORK,
      ),
      providers: cell(
        'Providers of high-risk AI systems must make sure the system meets the Act’s requirements, run a quality management system, keep documentation and logs, complete a conformity assessment before placing it on the market, draw up an EU declaration of conformity, affix the CE marking and register the system (Article 16).',
        EU_A16,
      ),
      deployers: cell(
        'Deployers of high-risk systems must use them according to the instructions, give human oversight to people with the competence, training and authority, monitor operation, keep the logs under their control for at least six months, and inform workers’ representatives and affected workers before workplace use (Article 26).',
        EU_A26,
      ),
      transparency: cell(
        'Providers must design systems so people know they are dealing with AI unless that is obvious, and must mark synthetic audio, image, video and text in a machine-readable way. Deployers must disclose deepfakes, and AI-generated text published to inform the public on matters of public interest unless a person reviewed it and holds editorial responsibility. Exceptions apply (Article 50).',
        EU_A50,
      ),
      penalties: cell(
        'Up to EUR 35 million or 7% of worldwide annual turnover for banned practices; up to EUR 15 million or 3% for most operator obligations, including Articles 16, 26 and 50; up to EUR 7.5 million or 1% for incorrect information to authorities. The higher figure applies, except that for SMEs the lower applies. Member States lay down the detailed rules (Article 99).',
        EU_A99,
      ),
    },
  },
  {
    id: 'us-federal',
    name: 'United States (federal)',
    tags: ['use-specific', 'voluntary'],
    cells: {
      status: cell(
        'Executive Order 14365 (11 December 2025) sets a policy of a “minimally burdensome national policy framework” for AI, says a national standard should be worked out with Congress, and says that until one exists the administration will act against “onerous” state laws, starting with a Department of Justice AI Litigation Task Force. NIST’s AI Risk Management Framework (released 26 January 2023) is for voluntary use; NIST says version 1.0 is being revised.',
        US_EO,
        US_NIST,
      ),
      providers: null,
      deployers: null,
      transparency: cell(
        'The TAKE IT DOWN Act (Public Law 119-12, 19 May 2025) makes it a crime to knowingly publish non-consensual intimate images, including AI-made “digital forgeries”, and requires covered platforms, within one year of enactment, to run a notice-and-removal process and remove reported images as soon as possible and within 48 hours.',
        US_TAKEDOWN,
      ),
      penalties: cell(
        'Under Public Law 119-12, a platform that fails to reasonably comply with the notice-and-removal duties is treated as committing an unfair or deceptive act or practice, enforced by the Federal Trade Commission.',
        US_TAKEDOWN,
      ),
    },
  },
  {
    id: 'us-colorado',
    name: 'United States: Colorado',
    tags: ['use-specific'],
    cells: {
      status: cell(
        'Senate Bill 26-189 on automated decision-making technology (ADMT) was signed on 14 May 2026. It repeals and reenacts the earlier 2024 AI Act provisions, takes effect on 1 January 2027 (a few sections took effect on passage) and applies to consequential decisions made on or after that date: decisions about education, employment, housing, financial or lending services, insurance and other covered domains.',
        CO_ACT,
        CO_BILL,
      ),
      providers: cell(
        'From 1 January 2027 a developer of a covered ADMT must give each deployer documentation: intended uses and known harmful uses, categories of training data to the extent known, known limitations, and instructions for appropriate use, monitoring and meaningful human review. It must also notify deployers of material updates and keep compliance records for at least three years.',
        CO_ACT,
      ),
      deployers: cell(
        'Deployers must keep records for at least three years. After an adverse decision, a consumer may request instructions to correct inaccurate personal data and an opportunity for meaningful human review and reconsideration, to the extent commercially reasonable.',
        CO_ACT,
      ),
      transparency: cell(
        'Before using a covered ADMT to materially influence a consequential decision, a deployer must give clear and conspicuous notice to the consumer. Within thirty days of an adverse decision it must give a plain-language description of the decision and the ADMT’s role, and how to ask for more information.',
        CO_ACT,
      ),
      penalties: cell(
        'The Attorney General enforces the act through the Colorado Consumer Protection Act, and a violation is a deceptive trade practice. Before an enforcement action the Attorney General must send a notice of violation where a cure is possible, with 60 days to cure (that provision is repealed from 1 January 2030). The act creates no new private right of action and sets no penalty amount of its own.',
        CO_ACT,
      ),
    },
  },
  {
    id: 'us-california',
    name: 'United States: California (SB 53)',
    tags: ['developer-transparency'],
    cells: {
      status: cell(
        'Governor Newsom signed Senate Bill 53, the Transparency in Frontier Artificial Intelligence Act, on 29 September 2025. The press release describes it as a law for “large frontier developers”. I did not read the bill text, so I give no effective date.',
        CA_GOV,
      ),
      providers: cell('Large frontier developers must publish a framework on their website, according to the Governor’s press release.', CA_GOV),
      deployers: null,
      transparency: cell(
        'The law creates a mechanism for frontier AI companies and the public to report potential critical safety incidents to the California Office of Emergency Services, according to the Governor’s press release.',
        CA_GOV,
      ),
      penalties: cell(
        'The press release says the law sets civil penalties for noncompliance, enforced by the Attorney General’s office. I did not read the amount.',
        CA_GOV,
      ),
    },
  },
  {
    id: 'us-texas',
    name: 'United States: Texas',
    tags: ['use-specific'],
    cells: {
      status: cell(
        'The Texas Responsible Artificial Intelligence Governance Act (House Bill 149) was signed by the Governor on 22 June 2025 and took effect on 1 January 2026.',
        TX_HISTORY,
        TX_TEXT,
      ),
      providers: cell(
        'A person may not develop or deploy an AI system with the intent to incite or encourage self-harm, harm to others or crime (s. 552.052), or to unlawfully discriminate against a protected class; disparate impact alone is not enough to show intent (s. 552.056). A person may not develop or distribute an AI system with the sole intent of producing certain child sexual abuse material or unlawful sexual deepfakes (s. 552.057).',
        TX_TEXT,
      ),
      deployers: cell(
        'The same prohibitions apply to anyone who deploys an AI system. Government entities also may not use AI for social scoring that leads to unjustified or rights-infringing treatment (s. 552.053), or to identify a person from biometric data without consent where that infringes a legal right (s. 552.054).',
        TX_TEXT,
      ),
      transparency: cell(
        'A government agency that makes an AI system available to interact with consumers must disclose it before or at the time of interaction, in clear, plain language, even where it would be obvious. A provider of health care services must give the disclosure when AI is used in relation to treatment (s. 552.051).',
        TX_TEXT,
      ),
      penalties: cell(
        'Only the Attorney General can enforce, and there is no private right of action. The Attorney General must give written notice and the person has 60 days to cure. For uncured violations the civil penalty is $10,000 to $12,000 for a curable violation, $80,000 to $200,000 for an uncurable one, and $2,000 to $40,000 for each day a violation continues (ss. 552.101, 552.104, 552.105).',
        TX_TEXT,
      ),
    },
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    tags: ['voluntary'],
    cells: {
      status: cell(
        'The 2023 white paper set out five principles (safety, security and robustness; appropriate transparency and explainability; fairness; accountability and governance; contestability and redress), issued on a non-statutory basis and implemented by existing regulators. It said a statutory duty on regulators to have due regard to the principles was anticipated later, but would not be introduced if monitoring showed the framework worked. On 12 October 2026 the AI Minister said the government would “legislate wherever necessary”, and the government said stronger protections, such as reporting of serious AI incidents, would be considered through the Cyber Security and Resilience Bill regime. I did not find a more recent overall statement on primary pages.',
        UK_WHITE,
        UK_OCT,
      ),
      providers: null,
      deployers: null,
      transparency: null,
      penalties: null,
    },
  },
  {
    id: 'india',
    name: 'India',
    tags: ['voluntary', 'content-labelling'],
    cells: {
      status: cell(
        'MeitY released the India AI Governance Guidelines on 5 November 2025: seven principles (“sutras”), and an assessment that many AI risks can be addressed through existing laws, with voluntary measures and a review of legal gaps. The guidelines are guidance, not a statute. Separately, amendments to the IT Rules 2021 (G.S.R. 120(E), 10 February 2026) set duties for online intermediaries about “synthetically generated information”.',
        IN_GUIDE,
        IN_PIB,
        IN_RULES,
      ),
      providers: cell(
        'Under Rule 3(3), an intermediary that offers a tool able to create or share synthetic audio or visual content must use reasonable technical measures to stop users making content that breaks the law, including child sexual abuse material, non-consensual intimate imagery, false documents and deceptive depictions of real people or events. The Guidelines tell industry to comply with all Indian laws, adopt voluntary frameworks, publish transparency reports and provide grievance mechanisms.',
        IN_RULES,
        IN_GUIDE,
      ),
      deployers: cell(
        'Under Rule 4(1A), a significant social media intermediary must, before content is shown, require users to declare whether it is synthetically generated, use technical measures to verify the declaration, and label content confirmed as synthetic.',
        IN_RULES,
      ),
      transparency: cell(
        'Under Rule 3(3), synthetic content that is not unlawful must carry a prominent visible label, or a prominently prefixed audio disclosure for audio, plus permanent metadata or provenance information including a unique identifier where technically feasible, and intermediaries must not enable the label or metadata to be removed. The definition covers realistic audio, visual and audio-visual content and excludes routine good-faith editing such as noise reduction, transcription or compression that does not materially change it.',
        IN_RULES,
      ),
      penalties: cell(
        'Under Rule 7, an intermediary that fails to observe the rules loses the safe-harbour protection of section 79(1) of the Information Technology Act and is liable for punishment under any law in force.',
        IN_RULES,
      ),
    },
  },
  {
    id: 'china',
    name: 'China',
    tags: ['content-labelling', 'filing'],
    cells: {
      status: cell(
        'Two instruments I read: the Interim Measures for the Management of Generative AI Services (jointly issued by seven agencies; effective 15 August 2023) and the Measures for Labeling AI-Generated Synthetic Content (notice dated 7 March 2025; effective 1 September 2025). The Interim Measures say the state applies inclusive and prudent supervision, graded by category and level (Article 3).',
        CN_GEN,
        CN_LABEL,
      ),
      providers: cell(
        'Providers of generative AI services to the public in China must use data and base models from lawful sources, respect intellectual property, get consent for personal information, label content under the deep synthesis rules, handle and report illegal content, and offer a complaint channel. Services with public-opinion attributes or social-mobilisation capability must complete a security assessment and algorithm filing (Interim Measures, Articles 7, 9 to 15 and 17).',
        CN_GEN,
      ),
      deployers: cell(
        'Content-distribution platforms must check file metadata for implicit labels and add prominent prompts around AI-generated or suspected AI-generated content. App stores must ask whether an app offers AI generation and check its labelling materials. Users who publish AI-generated content must declare it. Nobody may maliciously delete, alter, forge or hide labels (Labeling Measures, Articles 6, 7 and 10).',
        CN_LABEL,
      ),
      transparency: cell(
        'Providers must add explicit labels that users can clearly perceive (text, sound or graphic prompts) and implicit labels in file metadata recording the content’s AI-generated attribute, the provider’s name or code and a content number (Labeling Measures, Articles 3 to 5).',
        CN_LABEL,
      ),
      penalties: cell(
        'Under the Interim Measures (Article 21), breaches are punished under the Cybersecurity Law, Data Security Law, Personal Information Protection Law and similar laws. Where none provides, authorities may warn, publicly criticise and order correction within a time limit, and for refusal or serious cases order the services suspended. The Labeling Measures (Article 13) leave handling to the internet, telecom, public security and broadcasting authorities under the relevant laws.',
        CN_GEN,
        CN_LABEL,
      ),
    },
  },
  {
    id: 'korea',
    name: 'South Korea',
    tags: ['risk-based', 'promotion', 'content-labelling'],
    cells: {
      status: cell(
        'The Framework Act on the Development of AI and the Establishment of a Foundation for Trust (“AI Basic Act”) was passed by the National Assembly on 26 December 2024 and, according to the Ministry of Science and ICT, takes effect in January 2026, a year after promulgation. The national law database now lists the version in force from 21 July 2026 (Act No. 21311, partly amended on 20 January 2026).',
        KR_MSIT,
        KR_A31,
      ),
      providers: cell(
        'The Act places its duties on “AI business operators” (인공지능사업자). I did not read its definition and do not map it onto provider or deployer. The ministry’s summary says the Act defines high-impact AI and generative AI as regulatory targets and sets obligations for transparency (Article 31), safety (Article 32) and operators’ responsibilities (Article 34).',
        KR_MSIT,
        KR_A31,
      ),
      deployers: null,
      transparency: cell(
        'Under Article 31, before offering a product or service that uses high-impact AI or generative AI, an operator must tell users in advance that it runs on AI. Output of generative AI must be marked as generated by it. Realistic synthetic sound, images or video must be notified or labelled so users can clearly recognise them, in a way that does not impair enjoyment where the work is artistic or creative.',
        KR_A31,
      ),
      penalties: cell(
        'Under Article 43, an administrative fine of up to KRW 30 million applies for failing to give the Article 31(1) advance notice, failing to designate a domestic representative (Article 36(1)), or failing to comply with a suspension or correction order (Article 40(3)).',
        KR_A43,
      ),
    },
  },
  {
    id: 'japan',
    name: 'Japan',
    tags: ['promotion'],
    cells: {
      status: cell(
        'The Act on Promotion of Research and Development, and Utilization of AI-related Technology (Act No. 53 of 2025) was enacted on 28 May 2025, partly enforced on 4 June 2025 and fully enforced on 1 September 2025. It sets basic principles, an AI Basic Plan and an AI Strategic Headquarters chaired by the Prime Minister.',
        JP_OUTLINE,
        JP_ACT,
      ),
      providers: cell(
        'The Act’s duty covers anyone who develops or provides products or services using AI, or uses AI in business (“utilization business operators”): they are to endeavour to use it actively and must cooperate with measures taken by national and local government (Article 7). It does not separate providers from users.',
        JP_ACT,
      ),
      deployers: null,
      transparency: cell(
        'Ensuring transparency is one of the Act’s basic principles, per the Cabinet Office outline. The government is to set guidelines in line with international norms (Article 13) and to analyse cases of rights infringement and give guidance, advice and information to businesses (Article 16). The article list of the translation contains no labelling rule.',
        JP_OUTLINE,
        JP_ACT,
      ),
      penalties: cell(
        'I found no penalty provisions in the official English translation (a text search for “penalt”, “fine” and “imprison” found none).',
        JP_ACT,
      ),
    },
  },
  {
    id: 'oecd',
    name: 'International: OECD',
    tags: ['voluntary'],
    cells: {
      status: cell(
        'The OECD AI Principles were adopted in May 2019 and updated in May 2024. Their values-based principles are inclusive growth and well-being; human rights and democratic values; transparency and explainability; robustness, security and safety; and accountability. The OECD says the EU, the Council of Europe, the US and the UN, among others, use its definition of an AI system.',
        OECD,
      ),
      providers: null,
      deployers: null,
      transparency: null,
      penalties: null,
    },
  },
];

/* ---------- helpers ---------- */

/** True when the date (YYYY-MM-DD) is more than `days` before `now`. Used to flag stale entries. */
export function isStale(checked: string, now: Date, days = 183): boolean {
  const d = new Date(`${checked}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return true;
  return now.getTime() - d.getTime() > days * 86_400_000;
}

/** The oldest `checked` date among the cell's sources. */
export function oldestChecked(c: Cell): string {
  return c.sources.map((s) => s.checked).sort()[0];
}

/** Jurisdictions matching any of the chosen tags; no tags chosen means all. */
export function filterJurisdictions(list: readonly Jurisdiction[], tags: readonly Tag[]): Jurisdiction[] {
  if (tags.length === 0) return [...list];
  return list.filter((j) => j.tags.some((t) => tags.includes(t)));
}

export type EuTier = 'prohibited' | 'operator' | 'information';
export const EU_TIERS: Record<EuTier, { label: string; fixed: number; percent: number }> = {
  prohibited: { label: 'Banned practices (Article 99(3))', fixed: 35_000_000, percent: 7 },
  operator: { label: 'Most operator obligations, including Articles 16, 26 and 50 (Article 99(4))', fixed: 15_000_000, percent: 3 },
  information: { label: 'Incorrect information to authorities (Article 99(5))', fixed: 7_500_000, percent: 1 },
};

/**
 * The ceiling on a fine under Article 99 for an undertaking: the higher of the fixed amount and the share of
 * worldwide annual turnover; for an SME, the lower of the two (Article 99(6)). It is a ceiling, not a prediction.
 */
export function euFineCeiling(tier: EuTier, turnoverEur: number, sme: boolean): number {
  const t = EU_TIERS[tier];
  const byShare = (Math.max(0, turnoverEur) * t.percent) / 100;
  return sme ? Math.min(t.fixed, byShare) : Math.max(t.fixed, byShare);
}
