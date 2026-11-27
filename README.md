# מתמטיקה בדידה — מערכי הרצאה (Discrete-Mathematics-Ramat-Gan-Fall-2026)

Hebrew (RTL) interactive lecture notes for the Discrete Mathematics course at the Ramat Gan Academic College, built as a **Quarto book** with small browser games next to the prose. Planning documents live in `../Resources/`.

## Source

- `index.qmd`: front page (course details, how to read the notes, topic list, sources).
- `01-logic.qmd`: chapter 1, all of logic (lecture 1): propositions, connectives, truth tables, implication, equivalence and De Morgan, propositional calculus, deduction rules, knights and knaves.
- `02-sets.qmd`: chapter 2, sets and quantifiers, set operations, power sets and proofs.
- `03-relations.qmd`: chapter 3, ordered pairs, Cartesian products, relations between sets, and relations on a set with directed diagrams. Continue in chunks: reflexive, symmetric, transitive, antisymmetric relations, and the identity relation, in that order.
- Practice stays near the material it uses; mixed practice may conclude a chapter.
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

## Writing, organization and proofreading

These rules are mandatory for new writing and every passage being proofread. They supersede conflicting advice in historical review documents. Maintain this guide by revising the relevant section; consolidate overlapping rules rather than appending another exception or duplicate.

### Logical order and purpose

- Put prerequisites before their uses. Check dependencies between paragraphs, definitions, results, examples, hints and solutions. After moving material, check what depends on it.
- Every section, paragraph and sentence must have a clear purpose at its location. Remove or combine repetition that adds no explanation or useful distinction.
- Name the specific set, sequence, relation or other object. Prefer a precise formula to vague wording when it clarifies the meaning.
- Explain transitions and mathematical steps. A roadmap listing upcoming topics does not explain why they are needed; motivate a new idea with a concrete problem or question.
- Introduce unfamiliar vocabulary when it first matters, including prerequisite mathematical vocabulary. Use `[**term**]{.term}` for the shared term styling, without relying on colour alone.

### Definitions, statements and teaching boxes

- Define what the object is and what distinguishes it before explaining its notation. A correct formula or motivating example does not replace a missing defining sentence. State an equality criterion when it is part of specifying the object.
- Start from familiar objects and introduce new terminology afterward. For an ordered pair: two elements, not necessarily distinct, written in an order that matters; then name the first and second components. Do not substitute unexplained words such as “components” or “structure” for that explanation.
- Emphasize the defined term and the essential distinctions. Keep typographic advice separate from the definition. State boundary cases accurately: `(a,a)` has two component positions, while `{a,a}={a}` has one element; repeated entries in set notation are not forbidden.
- Use the existing boxes according to their mathematical and teaching purpose:

| Purpose | Box |
| --- | --- |
| Definition | `.thmdef` |
| Theorem or proposition | `.thmthm` or `.thmprp` |
| Proof, separate from its statement | `.thmproof` |
| Concrete illustration, including a standalone “למשל” passage | `.thmexm` |
| Caution, such as the effect of reversing Cartesian-product factors | `.thmwarn` (“שימו לב”) |
| Terminology or reusable method | `.thmterm` or `.thmmethod` |
| Important point to remember or summary | `.thmkey` or `.thmsummary` |
| Self-test, question or activity | `.thmchk`, `.thmqst` or `.thmgame` |

- Keep terminology, method, “important to remember,” and similar teaching components. Rules about purpose and repetition govern their wording and placement, not their removal.
- Place an illustrative example in its own adjacent box; do not bury it in running exposition or nest it inside a warning. Keep a general statement, its proof and its concrete calculations distinct.

### Examples and learning sequence

- Every definition, theorem and proposition must have an immediate clear example or illustration. Follow with several purposeful examples, including basic cases and useful boundary cases.
- Show why an assumption is needed or what changes without it when that helps understanding. Discuss weaker assumptions and generalizations only when they serve the current explanation; do not add difficulty for its own sake.
- Use the sequence: definition/result, examples, self-tests, solved questions, then activities. Dependent definitions may share later self-tests and solved questions, but each must still have its own immediate illustration.
- Self-tests must check core understanding. Solved questions and activities must be clear, illuminating and enjoyable; do not add activities merely to fill a slot.
- Reserve “game” / `.thmgame` for a graphical, interactive activity that offers a change of pace: students manipulate visible objects and see feedback. A written puzzle or an ordinary question with a playful title is still a question. The Cartesian-product card activity is an accepted example of a game.
- Keep practice and its hints and solutions near the material it uses. Mixed practice may conclude a chapter.
- Remove poetic, playful, suspenseful or vague exercise titles. Use the exercise number alone unless a short, literal title identifies the mathematical concept or task. Examples may retain useful titles. Preserve numbered labels and stable reference IDs.

### Proofs and counting arguments

- Explain why each inference follows. Identify the objects being considered, use the stated assumptions, and conclude the actual claim. Do not compress an argument into an unexplained formula.
- In a counting proof, say what is counted, how many choices or groups there are, how many objects each contributes, and why every object is counted exactly once.
- Explain the operation that produces the total. In the Cartesian-product proof, each first element gives exactly `|B|` pairs, and there are `|A|` first elements. Counting `|A|` equally sized groups is repeated addition of `|B|`, which is the meaning of `|A|·|B|` for natural numbers. State the zero case where needed.

### Student input and model solutions

- Every answerable part of an exercise, self-test **or solved question** must accept student input whenever feasible. A heading such as “שאלות פתורות” does not exempt a question from this requirement. A hint, solution reveal or input for only the first part is insufficient. Supply appropriate input, checking, useful feedback and retry for each requested answer; keep the model solution folded separately.
- Preserve the dependency between parts. When a question asks students to construct a set/relation and then decide membership, use two stages: first accept and check the set of ordered pairs; then show a separate yes/no choice for each membership question. Do not replace the construction with multiple choice, or omit the membership input. Changing or resetting the first answer must clear and hide the dependent answers until the first stage is checked again. Revealing a solution must not mark a stage complete.
- Reuse existing answer widgets and the proof engine. A proof task should let the student construct and check a proof, not merely reveal one. Match the input to the mathematical work requested.
- For a short multiple-choice list, show selectable buttons rather than a dropdown; the shared widgets use buttons for up to four options. Keep answer checking, reset and a folded explanation. Yes/no questions use two buttons. Numeric answers still use input fields.
- Every proof-engine exercise must also have a folded, textbook-style written proof. Use connected mathematical prose, with formulas and explicit transitions, following essentially the same reasoning, cases and conclusions as the engine’s model solution. It must read as a proof, not as a transcript of interface actions or numbered engine rows.
- Keep the written proof and engine model synchronized. When either changes, compare both versions and revise the other if necessary. Use the established `written-proof-<exercise-id>` foldable alongside the set-proof editor; do not create a competing solution or duplicate an existing written proof.

### Hebrew and mathematical direction

- RTL Hebrew. Following the other books, sentence-ending punctuation right after inline math goes **inside** the math at its start (`$.x$`, `$,x$`).
- **Hebrew inside formulas:** write `\heb{דנה}`, `\heb{וגם}`, etc., in normal Hebrew reading order. Keep surrounding mathematics LTR; put each Hebrew label in its own `\heb{…}` and keep mathematical symbols outside it. Do not use bare `\text{…}` for Hebrew or reverse letters manually. As in the BGU calculus book, `_styles.html` defines `\heb` as `\text` and enables `mtextInheritFont` so MathJax renders a whole text run instead of reversed individual glyphs. The SVG export configurations must retain the same macro and font setting. During proofreading, check Hebrew labels, words, and names inside formulas as well as the direction of the formula as a whole. `tests/hebrew-math.test.mjs` guards this convention. A future native LaTeX/PDF edition needs the matching RTL macro from the calculus preamble; the HTML configuration alone does not configure XeLaTeX.
- Truth tables run RTL like the BGU book: the first variable is the rightmost column, rows are in the order TT…, the first variable changes slowest, and every column starts with T. The games' tables follow the same order.
- **Complete formulas in exercises:** every complete expression, including arithmetic operators, parentheses and coordinate commas, must occupy one LTR isolate. For example, `(x + 1, 4) = (3, y − 2)` is one unit; never isolate its individual pieces around `+`. In HTML widgets use the shared formula wrapper (`.m`/`.sets-math`, LTR and isolated); in plain-text prompts and feedback use the shared `readable()` formatter. Keep sentence-ending punctuation outside these LTR units: isolate `A × B`, then append the full stop in the surrounding Hebrew prose. This plain-text/HTML rule is distinct from the TeX punctuation convention above. Write normal source text; do not insert invisible direction controls manually or reverse the formula. During proofreading, check the full expression and its sentence boundary in prompts, feedback and revealed answers. When adding a new operator, extend the shared formatter if necessary and add a regression case, rather than patching individual prompts.

### Proofreading and verification

- Reread the changed passage in context, checking purpose, prerequisites, explicitness, mathematical correctness, meaningful emphasis and appropriate boxes.
- Check examples and solutions against their statements. Compare every affected prose proof with the engine model, including assumptions, case order, intermediate conclusions and final closure.
- Audit every instruction in a question (“write,” “find,” “is it a member?”, “prove,” “give a counterexample”) against its actual input and checker. Do this for the whole affected exercise section, including solved questions, before considering the work complete. A source check that merely finds one widget in a question is not enough to establish that all its parts are answerable.
- Try the student input and feedback. Check complete formula direction and sentence punctuation in prompts, answers and explanations. Source searches and automated tests do not establish visual correctness; report when browser verification is unavailable.

### Chapter-specific and implementation conventions

- **Staged exercises:** `games/shared/relation-practice.js` initializes boxes marked with `data-staged-exercise`. Use that attribute on numbered teaching boxes: the numbering filter replaces their CSS classes, so an extra class alone is not a reliable initialization hook.

- **Substitution activity:** `.open-statement-game` is enhanced by `games/shared/open-statement.js`, imported into `book.bundle.js`. It distinguishes missing values from false results and replaces every occurrence of the same variable together. Without JavaScript, its written example remains visible.
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
