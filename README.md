# Layerwise

Animated lessons, system designs and cost tools for AI engineers, from machine learning basics to agents and edge deployment. Built with Astro, React islands, MDX and `motion`. Deploys to GitHub Pages.

## Run it locally

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve the built site
```

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

`StackExplorer`, `Timeline`, `RequestLifecycle`, `AttentionViz`, `TokenChips`, `EmbeddingSpace`, `PipelineFlow` (with an optional loop), `NodeGraph` (boxes and lines with failure modes), `DecisionTree`, `ModelMemory`, `CostCalculator`, `LatencyBudget`, `Disclosure`. All respect `prefers-reduced-motion`.

Data used in visualisations is labelled in its caption as illustrative or example. Keep it that way: replace example prices and speeds with sourced numbers before presenting them as fact.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Create a new GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings, Pages** and set **Source** to **GitHub Actions**.
3. Push (or run the workflow manually from the Actions tab). The site appears at `https://<user>.github.io/<repo>/`.

The workflow works out the site URL and base path from the repository name, so no config changes are needed. A repository named `<user>.github.io` is served from the root instead.

GitHub Pages on a **private** repository needs a paid GitHub plan. Public repositories can use Pages for free.

After the first deploy, set `repo` in `src/site.ts` to the repository URL to show a source link in the footer.

## Roadmap

- Automated Pulse ingestion: scheduled job collects release notes and papers, drafts summaries, opens a pull request for review.
- Dated pricing data as versioned JSON, shown with a "last verified" date in the calculators.
- Search (Pagefind), newsletter, and exported video clips from the same components (Remotion).
