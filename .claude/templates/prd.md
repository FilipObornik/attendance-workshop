# PRD: <title>

**Issue:** #NNN
**Status:** Draft | Approved
**Author:** @<user> (via Claude)
**Last updated:** YYYY-MM-DD

> A PRD answers **what** and **why**, never **how**.
> Tech stack, data shapes, API contracts, file paths → leave for the techspec.

## 1. Overview & objective
One paragraph: what is this feature, and what outcome does it enable?
Make the value explicit — finish the sentence "After this ships, users can ___".

## 2. Problem
What's broken / missing / awkward today? Who feels it, when, and how often?
Use a concrete moment if you can ("when an admin opens the dashboard each morning, …").

## 3. Users
Who benefits? For each persona, one line about their goal.

- **<Persona name>** — what they're trying to accomplish

## 4. User stories / scenarios
Walk through the feature as the user experiences it. Don't describe screens or buttons
in detail — focus on the journey and what happens at each step.

1. Trigger / entry point: how does the user arrive at this feature?
2. Steps the user takes
3. What they see / get at the end
4. What happens in failure / edge cases (from the user's point of view, not the system's)

## 5. Core requirements
Bulleted list of capabilities the feature must support. Phrase as user-visible behavior,
not implementation. Each item should be independently testable.

- Must do X
- Must handle Y when Z
- Should not do W

## 6. Acceptance criteria
The checklist that says "this is done". Each item is something a reviewer can verify
by interacting with the product (manually or via Playwright).

- [ ] <observable outcome>
- [ ] <observable outcome>
- [ ] <observable outcome>

## 7. UX principles (high-level)
Constraints on how this should feel — not what it should look like. Examples:
- Fast feedback (under 1s for the common case)
- No PII on the public surface
- Errors must be friendly + actionable
- Consistent with existing admin look & feel

If there's a wireframe/sketch link, drop it here. Don't describe pixel layouts.

## 8. Success metrics
How will you know the feature is working in the wild? One or two metrics tops.

- e.g. "≥ 90% of scans complete in one tap"
- e.g. "Admin dashboard recency complaints in #support drop to zero"

## 9. Non-goals / out of scope
What this PRD is **deliberately not** solving — so the techspec doesn't bloat.

- <thing we're explicitly NOT doing>
- <thing that belongs to a future PRD>

## 10. Risks & open questions
Decisions that need a human's call before techspec. Capture them here, don't guess.

- **<Question>** — context, options considered, what's blocking the decision
- **<Risk>** — what could go wrong, who owns mitigation

## 11. Future expansion (optional)
One or two follow-ups this feature naturally enables. Bullets, not paragraphs.
