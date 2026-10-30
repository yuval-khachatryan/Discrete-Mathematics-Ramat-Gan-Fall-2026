# מתמטיקה בדידה — מערכי הרצאה (Discrete-Mathematics-Ramat-Gan-Fall-2026)

Hebrew (RTL) interactive lecture notes for the Discrete Mathematics course at the Ramat Gan Academic College, built as a **Quarto book** with small browser games next to the prose. Planning documents live in `../Resources/`.

## Source

- `index.qmd`: front page (course details, how to read the notes, topic list, sources).
- `01-logic.qmd`: chapter 1, all of logic (lecture 1): propositions, connectives, truth tables, implication, equivalence and De Morgan, propositional calculus, deduction rules, knights and knaves.
- `02-sets.qmd`: chapter 2, syllabus-based set theory outline (TODOs), followed by the quantifier material and games.
- Self-practice is at the end of each chapter: 40 logic exercises in chapter 1, and 8 quantifier exercises in chapter 2.
- `_quarto.yml`: book config (HTML only for now). `_styles.html`: shared CSS and the small page scripts (T/F quizzes, iframe auto-height). `theorem-numbering.lua`: the numbered-box filter, copied from the Ariel notes, with `.thmgame` (משחק) and `.thmchk` (בדיקה עצמית) added.
- `games/<name>/`: one folder per game, each a standalone page (`index.html`, `game.js`, `levels.js`, `game.css`).
- `games/shared/`: `shell.js` + `shell.css` (the frame every game shares), `logic.js` (formula parser, evaluation, truth tables), `sprites.js` (the characters and icons as SVG), `sprites/` (the same pictures as files, used by the book's CSS), `autosize.js` (iframe height).

## Repository and site

- Source: <https://github.com/yuval-khachatryan/Discrete-Mathematics-Ramat-Gan-Fall-2026> (`main`)
- Site: <https://yuval-khachatryan.github.io/Discrete-Mathematics-Ramat-Gan-Fall-2026/>, published with `quarto publish gh-pages` (see `../Resources/Publishing_GitHub_Pages.md`)

## Build

```bash
npm install                 # once: esbuild (game bundles) + playwright-core (browser checks)
quarto preview              # live local preview
quarto render               # HTML book into _book/ (runs tools/build-games.mjs first)
npm test                    # node --test tests/  (game checkers, level data, bundles up to date)
node tools/build-games.mjs     # rebuild the game bundles by hand
node tools/build-sprites.mjs   # after editing games/shared/sprites.js
node tools/draw-mitzi.mjs      # the Mitzi caricatures in §1.3 (images/mitzi-*.svg)
```

**Game bundles.** The games are written as ES modules (`games/<name>/game.js` importing `../shared/*.js`). Browsers refuse to load module scripts from a page opened from disk (`file://`), so each `index.html` instead loads `game.bundle.js`: the same code bundled by esbuild into one classic script. `quarto render` rebuilds the bundles as a pre-render step, and `npm test` fails if one is stale. Never edit a `game.bundle.js` by hand. As a result, the rendered book works when opened straight from `_book/index.html`. Opened from disk, only Quarto's own extras (search, TOC highlighting) are missing, because those are Quarto's module scripts. With `quarto preview` or on the web, everything works.

Browser checks use the locally installed Google Chrome through `playwright-core` (dev-only):

```bash
node tests/shot.mjs "<url>" out.png --w 390 --full --click "<selector>"   # screenshot + console/404 report
node tests/sections.mjs "<chapter url>" <outdir> sec-negation sec-or      # one PNG per section
```

## Games

Each game calls `startGame({id, title, levels, mount})` from `games/shared/shell.js`. The header comment there documents the contract. The shell owns the level picker, the בדיקה / רמז / איפוס / פתרון / לשלב הבא buttons, feedback, three-step hints, the debrief and saved progress (`localStorage`, namespaced `dm:<game>:v1`). URL parameters:

| parameter | effect |
|---|---|
| `?level=<id>` | start at that level (with `embed=1` and no `levels`: show only that level) |
| `?levels=a,b,c` | only these levels, in this order |
| `?embed=1` | compact mode for an iframe in a chapter |
| `?present=1` | large controls for the projector |

Embedding in a chapter:

```markdown
:::: {#box-game-and .thmgame title="שני מגעים בטור"}
```{=html}
<iframe class="widget-frame" src="games/circuit/index.html?level=and-predict&embed=1" loading="lazy" title="…"></iframe>
```
::::
```

| game | folder | levels (ids) |
|---|---|---|
| תנו ירוק! (switch circuits: lamp, two-way switch, full red/green signal) | `games/circuit/` | single, not, and-predict, or-predict, xor-stairs, explore, locked, fill, never, always, dm-robot, dm-and, dm-or, full-and, full-or, implies, converse, contrapositive |
| דוכן הפלאפל (three mathematicians at a falafel stand; ∧ / ∨) | `games/barman/` | classic, no-early, after-no, anyone, anyone-serve, design |
| מי עובר בשער? (knights and knaves) | `games/gate/` | both-knights, both-knaves, or-knave, at-least-one, three, impossible, ambiguous, if-knight, if-batya, exactly-one |
| הבלש של הקפטריה (deduction rules) | `games/detective/` | mp, mt, hs, judge, chain, culprit |
| מצאו עד (quantifiers) | `games/witness/` | witness, counter, check-all, nobody, negation, order |

Compare levels (`dm-*`, `converse`, `contrapositive`): the robot claims two circuits always agree, and you refute the claim with one row or confirm it by checking every row. `logic.js` also knows ⊕ (exclusive or, typed `^`).

Every level file is checked by a test in `tests/` (solvable when it says so, advertised number of solutions, and so on). Run `npm test` after editing levels.

## Interactive exercises in the chapters

These are lecture notes, so no exercise shows its whole solution at once. `games/shared/book.js` (bundled to `book.bundle.js`, loaded on every page by `_styles.html`) turns plain fenced divs into widgets. Without JavaScript everything stays visible.

```markdown
::::: {.solve}            step-by-step solution: hints one at a time, then the steps one at a time
::: hint
…
:::
::: step
…
:::
:::::

:::: {.ttq vars="A,B" cols="A | B; !(A | B)"}     truth table to fill in: check, a hint for one cell,
::: after                                         the solution column by column
shown once the table is right
:::
::::

:::: {.fq answer="A & !B" vars="A,B,C"}           formula answer, checked by logical equivalence;
prompt                                            a wrong answer gets the row where it differs
::: hint
…
:::
::: explain
…
:::
::::
```

A `<div class="tf-quiz">` can contain `<div class="tf-why">…</div>`, which appears once the reader has answered. Add `tf-explained` to the quiz when its explanation should be visible from the start, as in the introductory proposition examples. Raw HTML is not processed by Pandoc, so write math there as `\(…\)`. `tests/chapter01.test.mjs` parses every `cols=` and `answer=` formula in the chapter, and checks the chapter's claims by brute force.

## Conventions

- RTL Hebrew. Following the other books, sentence-ending punctuation right after inline math goes **inside** the math at its start (`$.x$`, `$,x$`).
- Truth tables run RTL like the BGU book: the first variable is the rightmost column, rows are in the order TT…, the first variable changes slowest, and every column starts with T. The games' tables follow the same order.
- Inside the games, any formula or `A = T` goes in one `<span class="m">…</span>` (LTR, isolated). Otherwise the bidi algorithm reverses it.
- **Explain vocabulary where it first matters:** introduce a concrete example before naming the concept. This includes prerequisite math such as even numbers, prime numbers, division without remainder and powers. Use `[**term**]{.term}` for the shared purple accent; do not rely on colour alone. Editorial rationale is recorded in `../Resources/Hebrew_Examples_and_Games_Review.md`.
- **Substitution activity:** `.open-statement-game` is enhanced by `games/shared/open-statement.js`, imported into `book.bundle.js`. It distinguishes missing values from false results and replaces every occurrence of the same variable together. Without JavaScript, its written example remains visible.
- **Lecture flow:** place each exercise with its relevant explanation and keep its hints/solution beside it. There is no end-of-chapter exercise bank. When moving an exercise earlier, check that every symbol and idea used by its hints has already been introduced.
- **Teaching order:** introduce statement names before open statements and `P(x)`. Explain truth tables before the first connective. For each connective: everyday meaning, definition together with its truth table, then visualization or game. Distinguish defining a connective from computing a compound statement using the established definitions. XOR uses both `⊕` and underlined `∨`; formula inputs accept `⊕`, `⊻` and `^`.
- **Logic comes first:** explain what a statement says and why it is true or false before using a circuit to illustrate it. Section 1.4 introduces propositions, open statements, domains and substitution without circuit terminology.
- **Pictures follow the chapter** (games/circuit/circuit.js, `view` per level):
  - `lamp`: the default for every introductory formula, including A and ¬A. One plain bulb is lit for true and dark for false. The same bulb is used in status icons.
  - `dual`: introduced at logical equivalence, starting with `dm-robot`. Each formula has a red/green signal, so agreement in every row is visible, including rows where both formulas are false. The green network represents φ and the red network represents ¬φ.
  - `switch`: the renderer still supports the older two-way-switch picture; the current levels do not use it.
  A lever moves all its contacts; hovering or focusing highlights them. The view test checks that levels before equivalence use bulbs and all three De Morgan comparisons use signals.
- **Truth values remain explicit:** T/F and the Hebrew words for true/false accompany the graphics. Early activities use lit/unlit bulbs; red/green signals are explained when equivalence is introduced. On signals, position and pedestrian figures provide additional cues besides colour. Variable tags avoid red and green.
- Games: plural imperative to the reader (״סמנו״, ״נסו״), feedback in the order *what you did → why it fails → what to try*, no timers and no penalties, every action available by click/keyboard, and colour never the only cue.
- The puzzles are original, in the spirit of Smullyan. The Smullyan PDF in `../Resources/` is a reference only and is not part of the site.

## Not yet done

- PDF edition (copy the `pdf:` block from the Ariel notes' `_quarto.yml`, then add static figures for the circuits).

- MathJax is still loaded from Quarto's CDN. The games themselves need nothing external.
