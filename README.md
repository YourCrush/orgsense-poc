# OrgSense — a living, functional org chart (proof of concept)

> **What it is:** a browser-based prototype that lets people **describe what they actually do** in plain language, then lets anyone **ask "who does X?"** and get a real answer — with the person's team and published contact info.
>
> **Why it exists:** titles like *"IT Professional I"* tell you nothing about someone's responsibilities, skills, or where they work. Today, finding the right person means hunting through the Teams/Workday org chart and guessing from reporting lines. OrgSense replaces the guess with a question.

**This is a proof of concept for a leadership demo — not production software.** All people and details in it are fictional. See [Scope & honest limitations](#scope--honest-limitations) and [AI-DISCLOSURE.md](AI-DISCLOSURE.md).

---

## Live demo

Once GitHub Pages is enabled (see [Deploying](#deploying-to-github-pages)), the site is served at:

```
https://<your-username>.github.io/<repo-name>/
```

You can also just open `index.html` directly in a browser — it runs fully client-side.

---

## The core idea (the workflow to show leadership)

1. **Pick a persona** (demo only — the *Sign in* chip in the top-right lets you choose who you are, or add yourself). You can browse and search without this; you only need it to update a profile.
2. **Update your information.** You're greeted by a single chat box. Click *"Update my information"* and describe your role in plain language — e.g. *"I'm the Deputy CISO. I'm responsible for vulnerability management and I run the security operations team."* The system parses that into a structured profile (role, responsibilities, skills, projects) that you can tidy up and save.
3. **Ask a question later.** The next day, someone types *"Who is responsible for Windows updates in the College of Engineering?"* and gets back the right person, their team, and their contact info — **because someone told the system that's what they do.**
4. **The honest failure mode.** If nobody has described a capability, the system says so plainly: *"No one has told me they do that yet."* That's the whole pitch for the larger effort — the value scales with how many people fill in their profiles. A **coverage stat** in the top bar makes that concrete.

### Good things to demo

- Search: *"Who handles MFA for students?"*, *"Who can help with a phishing email?"*, *"Who runs the HPC cluster?"*, *"Who do I ask about software licensing?"*
- The **live-add moment:** search for something no one has described yet (e.g. *"Who does vulnerability management?"* — the seeded "Raj Patel" is intentionally left undescribed), get the empty answer, then fill in a profile and search again to see it appear.
- **Find a team** to show the **Team API** — pick a team (e.g. *Identity Services*) and you get what it provides and *how to engage it* (self-service vs. request vs. collaborate), not just a name. Capability searches like *"who handles MFA?"* surface the providing team alongside the person.
- **Browse the org** to show the coverage gap — greyed-out people/teams are directory entries no one has described yet.

---

## How it works

Everything runs in the browser. There is **no backend and no database** — which is exactly what GitHub Pages supports (static files only).

| Concern | How it's handled |
| --- | --- |
| **Storage** | The browser's `localStorage`. What you enter persists across reloads on that machine, so you can pre-load sample data and add "real" info live during a demo. **Export / Import (JSON)** lets you save a snapshot and reload it on another laptop. **Reset** restores the sample org. |
| **The "AI"** | Two interchangeable engines (below). |
| **Sample data** | ~20 fictional staff **and 11 teams** at a fictional "Northgate State University." Most have full descriptions / published Team APIs; a handful are deliberately left *undescribed* to power the coverage stats and the live-add demo. |

### The two "AI" engines

Because a static site can't safely hide an API key, OrgSense ships with a **simulated engine by default** and an **optional real-AI mode**:

1. **Local matching engine (default, no key).** Tokenizes the question, expands it with a synonym map (so *"Windows updates"* also matches *patching / SCCM / Intune*), and scores each described profile across weighted fields (role, responsibilities, skills, projects, team, unit). It reports **which terms matched**, so a demo audience can see *why* a result came back. Deterministic, instant, works offline.
2. **Real Claude (optional).** In **Settings → Search engine**, toggle *"Use real Claude AI"* and paste your own Anthropic API key. Search and profile-parsing then route through the real model via a direct browser call to the Messages API. The key is stored only in your browser and is never committed. Model defaults to `claude-opus-4-8` (selectable). If a live request fails, it automatically falls back to the local engine so the demo never dead-ends.

### Teams — the Team API (Team Topologies)

OrgSense models **teams**, not just people, using the [Team Topologies](https://teamtopologies.com/) idea of a **Team API**: each team publishes what it *is*, what it *provides*, and *how to engage it*.

- Each team is tagged with a **team type** — *Platform*, *Enabling*, *Stream-aligned*, or *Complicated-subsystem* — shown as a badge. (The taxonomy is plain-language and easy to relabel for a non-technical audience.)
- A team's card lists **what it provides**, each item tagged with an interaction mode — **self-service**, **request**, or **collaborate** — plus how to reach it (channel, queue, hours, SLA) and its members.
- This turns a lookup from *"who do I email?"* into *"how do I consume this capability?"* — a capability search surfaces the **team that provides it** alongside the matching person.
- Teams have their own coverage: one seeded team is intentionally left without a published Team API to show the gap (visible in **Browse the org** and the *Find a team* list).

This is a **v1 slice** — team cards are seeded and read-only in the POC. Letting a team lead publish/update a Team API from the chat (mirroring the person flow) and mapping team-to-team dependencies are the natural next increments.

---

## Project structure

```
.
├── index.html          # Single-page UI (chat, browse, settings, login)
├── css/
│   └── styles.css       # All styling; light + dark aware
├── js/
│   ├── data.js          # Seed people + teams + localStorage layer (storage, coverage, import/export)
│   ├── engine.js        # Simulated matcher (people + teams), free-text parser, optional Claude integration
│   └── app.js           # UI wiring, chat, intent routing, update flow, Team API cards
├── README.md
├── ARCHITECTURE.md      # Proposed production architecture + diagrams (design)
├── AI-PLAYBOOK.md       # Prompts, output schemas & model config for every AI task (design)
├── INTEGRATIONS.md      # How to plumb in Microsoft Teams + Workday (design / drop-in reference)
├── AI-DISCLOSURE.md     # What the AI did vs. what the human did
├── LICENSE              # MIT
└── .nojekyll            # Tell GitHub Pages to serve files as-is
```

No build step, no dependencies, no framework — plain HTML/CSS/JS so it "just works" on Pages.

---

## Running locally

Just open `index.html` in a browser. (Optionally, serve the folder with any static server, e.g. `python3 -m http.server`, and visit `http://localhost:8000`.)

---

## Deploying to GitHub Pages

If you used the `gh` CLI setup, this was done for you. Otherwise:

1. Push this repo to GitHub (a **public** repo gets Pages hosting on the free tier).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**, select your default branch and the `/ (root)` folder, and **Save**.
4. Wait ~1 minute; your site appears at `https://<username>.github.io/<repo>/`.

The `.nojekyll` file ensures Pages serves the files as plain static assets.

---

## Suggestions baked in (open questions for the real effort)

The prompt for this POC explicitly asked for suggestions rather than treating the brief as fixed. A few that made it in, and some to discuss for the production version:

- **A "Browse the org" view and a coverage KPI** — leadership tends to want the whole picture and a number they can drive.
- **Show *why* a result matched, and handle the empty case honestly** — the failure mode is the most persuasive part of the pitch.
- **Free-text → structured profile** — capturing structure (not just a paragraph) is what makes search quality good; the parse step demonstrates the "AI plumbing" directly.
- **Team Topologies "Team API" (implemented — v1)** — teams publish what they provide and *how to engage* them, tagged by team type. Reframes the tool from a directory into an operating model. See [teamtopologies.com](https://teamtopologies.com/).
- **For production, consider:** real SSO login; syncing published contact info from Workday/Teams automatically; a proper backend so profiles are shared org-wide (not per-browser); approval/ownership so people can only edit their own entry; and periodic nudges to raise coverage.

Three design docs sketch the production system in detail (all forward-looking, not yet implemented):

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — proposed system architecture, with component/flow diagrams and a phased roadmap.
- **[AI-PLAYBOOK.md](AI-PLAYBOOK.md)** — the system prompts, JSON output schemas, model choices, and guardrails for every AI task (profile parsing, search ranking, Team API extraction, …).
- **[INTEGRATIONS.md](INTEGRATIONS.md)** — how to pull the official org structure/contact info from Workday + Microsoft 365 and let people update profiles from inside Teams.

---

## Scope & honest limitations

- **No real authentication.** "Sign in" just picks an identity so the demo can pre-fill your profile.
- **Data is per-browser**, stored in `localStorage`. It is not shared between people or devices (use Export/Import to move a snapshot).
- **All data is fictional.** Do not enter real personal information into the hosted demo.
- **The default engine is rules-based**, not a language model. It's designed to *feel* conversational and to be honest about what it is.

---

## License

MIT — see [LICENSE](LICENSE).

---

## AI assistance

This project was built with the assistance of AI (Anthropic's Claude, via Claude Code). See **[AI-DISCLOSURE.md](AI-DISCLOSURE.md)** for a specific breakdown of what the AI did and what the human directed and decided.
