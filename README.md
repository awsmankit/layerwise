# Layerwise

**Learn how AI works, one layer at a time.** Free, interactive lessons, games, coding labs and revision tools for everyone from school students to professional engineers. No accounts, no tracking, and it works offline.

**Live site: [awsmankit.github.io/layerwise](https://awsmankit.github.io/layerwise/)** · [What's new](https://awsmankit.github.io/layerwise/changelog/) · [Releases](https://github.com/awsmankit/layerwise/releases)

## Who it is for

| If you are | Start with |
|---|---|
| A child of about 11, a parent or a teacher | The *I'm new to AI* path (short lessons, games, no code) and the teacher kit with unplugged activities |
| A student or career-switcher | *I want to build my first model*, then *From machine learning to modern AI* |
| An engineer building with LLMs | *I build with LLMs*: prompts, RAG, agents, evals, system design |
| Running AI in production | *I run AI in production*, *I run GPUs and the platform*, *I build AI for devices and sound* |
| Someone who needs to use AI responsibly | *I want to use and build AI responsibly*: bias, privacy, safety, rules |
| Preparing for or running an interview | The interview section: candidate practice and an interviewer's scorecard |

## What is inside

Around 160 lessons in 17 topics (see the [changelog](CHANGELOG.md) for the exact count in each release), with a live demo in nearly every one:

- **Interactive demos:** train a neural network in your browser, teach a computer to tell apples from bananas, watch a spectrogram of a sound, watch attention and the KV cache at work, and many more.
- **Games** that teach system design and trade-offs: Blueprint, Cost Crunch, Fit the Model, Rack and Stack, Incident Room.
- **Coding labs** that run real Python in the browser and check your code.
- **Calculators** for cost, model memory, GPUs, latency and break-even.
- **Revision:** a quiz on every lesson, a Daily 5 with spaced repetition, learning paths with progress, completion certificates, and a "what should I learn next?" page.
- **Interview prep** for candidates and interviewers, a glossary, and engineering case studies.
- **Comfort and access:** text size and reading comfort settings, read-aloud, offline mode, and a design that works on a phone.

Lessons carry their sources, product facts are dated, and example numbers are labelled as examples.

## Collaborate

This is open source and meant to be shared. You can **ask for a lesson or feature** (say who it is for, from kids to pros), **report a mistake**, or **raise a pull request**. Start with [CONTRIBUTING.md](CONTRIBUTING.md); there are [issue templates](../../issues/new/choose) for each kind of request.

## Run it locally

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve the built site
npm test           # vitest: game engines, data integrity, lesson guards
npm run check      # astro check: types
npm run headlines  # refresh the News headlines from official feeds (also runs daily in CI)
npm run check-sources    # do every lesson's source link still resolve?
npm run check-links      # same for the case studies
npm run check-libraries  # same for the libraries map, and archived repos
```

The deploy workflow also runs every morning to refresh the headlines, and a weekly workflow runs the three link checks and opens an issue if any link is broken. Practice labs are tested under real Python (`python3` must be on your path for `npm test`).

Requires Node 22.23 or newer.

## Where things live

| Path | What it is |
|---|---|
| `src/content/lessons/<track>/*.mdx` | Lessons. Front matter: `title`, `track`, `level`, `order`, `summary`, `updated`, `sources` |
| `src/content/pulse/*.md` | Dated market notes. Copy `_TEMPLATE.md`; files starting with `_` are ignored |
| `src/data/tracks.ts` | The tracks and levels |
| `src/components/viz/` | Interactive visualisations used inside lessons |
| `src/styles/` | `global.css` (tokens, prose), `components.css` (visualisations), `pages.css` (layout) |
| `src/site.ts` | Site name, tagline, navigation, repo URL |

### Adding a lesson

1. Create `src/content/lessons/<track>/<slug>.mdx` with the front matter above.
2. Import what you need at the top of the file and use `client:visible` on interactive components:

   ```mdx
   import PipelineFlow from '../../../components/viz/PipelineFlow.tsx';

   <PipelineFlow client:visible stages={[{ title: 'Step', detail: 'What happens.' }]} />
   ```

3. Always use `withBase()` (from `src/lib/url.ts`) for internal links in `.astro` and React code, so they keep working under the GitHub Pages sub-path.

### Visualisations

`StackExplorer`, `Timeline`, `RequestLifecycle`, `AttentionViz`, `TokenChips`, `EmbeddingSpace`, `NextToken`, `PipelineFlow` (optional loop), `NodeGraph` (boxes and lines with failure modes), `DecisionTree`, `ModelMemory`, `CostCalculator`, `LatencyBudget`, `GpuExplorer`, `BreakEven`, `ServiceMap`, `ParallelismViz`, `Disclosure`, and `HairFigure` (isometric line figures). All respect `prefers-reduced-motion`.

In MDX every React component needs a `client:` directive (`client:visible` is the usual choice). A test fails the build if one is missing, because without it the component renders as inert HTML.

### Games

Five games live in `src/games/` as pure TypeScript engines with tests (`blueprint`, `costcrunch`, `fitmodel`, `rackstack`, `incidents`) and their interfaces in `src/components/games/`. Hardware specs are in `src/data/gpus.ts` and are approximate; always check the vendor datasheet.

Data used in visualisations is labelled in its caption as illustrative or example. Keep it that way: replace example prices and speeds with sourced numbers before presenting them as fact.

## Versions and releases

Every version is listed in [CHANGELOG.md](CHANGELOG.md), on the site at `/changelog/`, and as a tagged [GitHub release](https://github.com/awsmankit/layerwise/releases). The history is data in `src/data/releases.ts`; the page, the changelog and the release notes are all made from it, and a test fails if they drift apart.

Versions follow [semantic versioning](https://semver.org/), read for a learning site: **major** when the curriculum or the way learners move through it changes shape (new topics, rebuilt learning paths), **minor** for new lessons, labs, tools or features, **patch** for fixes (wording, links, layout, accessibility).

To make a release:

1. Add the new entry at the top of `src/data/releases.ts` (version, date, title, summary, highlights, and the counts at that point; the tests check the counts against the repository).
2. Set the same `version` in `package.json`.
3. Run `npm run changelog` to rewrite `CHANGELOG.md`, then `npm test`.
4. Commit and push to `main` (this deploys the site).
5. Tag it: `git tag -a v2.3.0 -m "v2.3.0" && git push origin v2.3.0`. The `Publish a GitHub release` workflow then creates the GitHub release from the same data.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Create a new GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings, Pages** and set **Source** to **GitHub Actions**.
3. Push (or run the workflow manually from the Actions tab). The site appears at `https://<user>.github.io/<repo>/`.

The workflow works out the site URL and base path from the repository name, so no config changes are needed. A repository named `<user>.github.io` is served from the root instead.

GitHub Pages on a **private** repository needs a paid GitHub plan. Public repositories can use Pages for free.

The footer's source link comes from `repo` in `src/site.ts`; change it if you fork the project.

## Licence

- **Code:** MIT, see [LICENSE](LICENSE).
- **Lessons and teaching material** (lessons, quizzes, interview questions, glossary, course plans, game scenarios, site text): CC BY 4.0, see [LICENSE-CONTENT](LICENSE-CONTENT). Reuse freely with credit: “Based on Layerwise by awsmankit, licensed under CC BY 4.0.”

## Credits

- Isometric line figures: [`@lucasmarkes/hairline`](https://github.com/lucasmarkes/hairline) by Lucas Marques, MIT licence.
- Fonts: Bricolage Grotesque, Source Serif 4 and JetBrains Mono through Fontsource (SIL Open Font Licence).

## Ideas welcome

Open for help (add yours as an [issue](../../issues/new/choose)): more languages (translations need reviewers and a font that covers the script), a project showcase, assessment tools for teachers, more in-browser labs, and more interactive demos for the topics that are still mostly text.
