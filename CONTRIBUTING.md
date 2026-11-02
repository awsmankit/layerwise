# Contributing to Layerwise

Thank you for wanting to help. Layerwise is a free, open-source place to learn how AI works, written for everyone from school students to professional engineers, and it gets better when people from different backgrounds shape it.

## Ways to help (you do not need to code)

- **Ask for something.** Open an issue and tell us **who it is for** (from which starting point to which level, for example "kids to curious beginners" or "engineers to experts"). There are templates for [a lesson or topic](../../issues/new?template=lesson_request.yml) and [a site feature](../../issues/new?template=feature_request.yml).
- **Report a mistake.** A wrong fact, an outdated product name, a confusing explanation: [open a correction](../../issues/new?template=content_correction.yml). A link to the right source helps most.
- **Try it and tell us.** Watch a child, a student or a colleague use a lesson and tell us where they got stuck.
- **Write or improve a lesson, a game, a lab or interview questions** with a pull request (below).
- **Review.** Check a draft for accuracy, or test a page on your phone and with a screen reader.

## Run it locally

```sh
npm ci
npm run dev      # http://localhost:4321
npm test         # unit tests and data checks (needs python3 on your path)
npx astro check  # types
```

Needs Node 22.23 or newer. See the README for the other scripts.

## Making a change

1. Fork the repository and make a branch.
2. Make your change (notes below for lessons).
3. Run `npm test` and `npx astro check`. The tests tell you what is missing, for example a lesson without a quiz.
4. Look at it on a phone-sized screen (360px wide) and in dark mode.
5. Open a pull request and fill in the template. Small pull requests are easier to review than big ones.

By contributing you agree that your work is released under the project's licences: code under MIT, and lessons and teaching material under CC BY 4.0 (see the README).

## Writing a lesson

A lesson is an MDX file at `src/content/lessons/<track>/<slug>.mdx`. Front matter: `title`, `track` (a folder name, see `src/data/tracks.ts`), `level` (`basic`, `intermediate` or `advanced`), `order` (a number; decimals slot a lesson between two others), `summary` (quote it if it contains a colon), `updated`, and `sources` (label and URL).

Around the lesson, three small pieces of data:

- **Quiz, takeaways and prerequisites:** an entry in an extras file in `src/data/extras/` (`takeaways`: 3 or 4 short lines; `prereq`: lesson keys; `quiz`: at least 4 questions, `answer` is the index of the right option). New file? Export a record and add it to `src/data/lesson-extras.ts`.
- **Videos (optional):** 1 to 3 per lesson in `src/data/videos/`. Check each one exists; the weekly link check does the rest.
- **Glossary terms:** `src/data/glossary.ts`. Each short definition is one or two plain sentences.

Then add the lesson to the learning paths it belongs to in `src/data/paths.ts` (the tests check that prerequisites come first) and link forward from related lessons.

**Interactive parts.** Every lesson should have something to poke: a diagram you can step through, a slider, a game, a small lab. Components live in `src/components/viz/`. In MDX every React component needs a `client:` directive (a test checks this). Put the logic in `src/lib/` with tests, so the component stays thin.

### Writing for different readers

| Reader | How to write it |
|---|---|
| Kids and teens (about 11 and up) | Short sentences, one idea per section, everyday examples (school, games, pets, phones), no maths or code in the main text, a few new words each explained in the sentence they appear. Put grown-up detail in a `Deep` block. |
| Complete beginners | Plain words first, then the name of the thing. A picture or a demo before a definition. |
| Builders and students | Worked examples with real numbers you computed, and the trade-offs, not just the happy path. |
| Experts | Precise, sourced, and honest about what is uncertain or changes fast. Date-stamp product facts. |

## The quality bar

- **Sources.** Every fact, number and product name comes from something you read. Link it, and say when you checked. Label made-up example numbers as examples. Do not state legal, medical or financial advice.
- **Phone first.** Check 360px wide, no sideways scrolling, tap targets at least 40px, readable text.
- **Accessible.** Works by keyboard and touch, respects reduced motion, never relies on colour alone, has real buttons and labels.
- **Private.** Layerwise has no accounts and no analytics. Progress lives in the learner's browser. Please do not add tracking, third-party scripts or fonts.
- **Kind and clear.** British spelling, plain words, no filler.

## Releases

Maintainers cut releases; the process is in the README. If your change is user-visible, it will be listed in the changelog (`CHANGELOG.md`, also at `/changelog/` on the site).

## Conduct

Please read the [code of conduct](CODE_OF_CONDUCT.md). Everyone is welcome here, children included.
