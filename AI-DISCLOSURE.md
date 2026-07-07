# AI assistance disclosure

This project was built collaboratively between a human (Kyle Levenick) and an AI
assistant (**Anthropic's Claude, running in Claude Code**). This document is an
honest, specific account of who did what, so that anyone reviewing this proof of
concept — including leadership — understands how it was produced.

## Summary

The **human owned the idea, the requirements, the key decisions, and the review.**
The **AI did the bulk of the implementation** (code and prose) under that
direction. Nothing here was shipped without a human in the loop.

## What the human did

- **Conceived the idea and the problem statement:** the "living functional org
  chart," the frustration that titles like *"IT Professional I"* don't describe
  what people do, and the two-mode workflow (describe yourself → let others find
  you).
- **Defined the core requirements:** a chat-first interface with a single input
  box; a way to update your own information; a way to ask "who does X?"; the rule
  that answers only exist if someone entered them; pre-populated fake data; sample
  prompts; temporary persistence so "real" information can be demoed to leadership.
- **Made the consequential decisions when asked**, including:
  - how the GitHub repository and Pages hosting would be set up;
  - that the "AI" should be a local simulated engine by default, with an optional
    bring-your-own-key real-Claude mode.
- **Directed the fictional context** (a university, given the "College of
  Engineering" example) and will review and approve the result before showing it
  to anyone.

## What the AI did

- **Recommended the technical approach** given the GitHub Pages constraint
  (static site → `localStorage` for storage; a rules-based matcher by default
  because an API key can't be safely hidden in a static site; an optional
  direct-to-Anthropic call for a live-AI mode).
- **Suggested product additions** beyond the original brief (a "Browse the org"
  view, a profile-coverage KPI, showing *why* a result matched, and an explicit,
  honest empty-state) — offered as suggestions for the human to accept or reject.
- **Wrote essentially all of the code:** the HTML structure, the CSS
  (including light/dark theming), the localStorage data layer, the ~20 fictional
  staff records, the local matching/synonym engine, the free-text-to-structured
  profile parser, the optional Claude integration, and the UI/interaction logic.
- **Wrote the documentation**, including this file and the README.
- **Generated all of the fictional sample data.** The names, roles, contact
  details, and organization ("Northgate State University") are invented and do not
  represent real people or a real institution.

## Notable specifics

- The optional real-AI integration calls Anthropic's Messages API directly from
  the browser (using the `anthropic-dangerous-direct-browser-access` header). The
  user's API key is stored only in their browser's `localStorage`, is never
  committed to the repository, and is sent only to Anthropic when that mode is on.
- The default engine is **not** a language model. It is deterministic
  keyword/synonym matching designed to feel conversational while being transparent
  about how it reaches an answer.

## What this is not

- It is **not** production software. There is no real authentication, no shared
  backend, and no connection to real Workday/Teams data. It is a demonstration
  artifact intended to make a larger effort easier to visualize and fund.

_Last updated when the proof of concept was generated._
