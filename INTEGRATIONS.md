# Integration guide — Microsoft Teams & Workday

**Status: design / drop-in reference, not yet implemented.** This document describes
how a production version of OrgSense would connect to **Workday** (for the
"official" org structure and contact info) and **Microsoft 365 / Teams** (for
contact enrichment, presence, and letting people update their profiles from
inside Teams). The current POC is a static, browser-only demo — nothing here is
wired up yet — but the data model and code seams are deliberately shaped so this
can drop in later. The last section, [Where the POC is already shaped for
this](#where-the-poc-is-already-shaped-for-this), points at the exact seams.

---

## The two layers: "official" vs "living"

OrgSense has two kinds of data, and they come from two different places:

| Layer | What it is | Source of truth |
| --- | --- | --- |
| **Official** | Who exists, their business title, department, reporting line, work contact info, which team they sit in | **Workday** (HR system of record) + **Microsoft 365 directory** |
| **Living** | What a person *actually does* (functional role, responsibilities, skills, projects) and each team's **Team API** (what it provides, how to engage) | **The people themselves**, via the OrgSense chat (web app or a Teams bot/tab) |

The whole point of OrgSense is that the *living* layer is the part titles can't
tell you. Workday/Teams give you a complete, always-current skeleton for free;
people fill in the functional layer on top. In the POC, that skeleton is exactly
what the `described: false` records represent — "imported from the org chart,
not yet self-described."

### Data flow (target architecture)

```
   ┌─────────────┐   nightly sync    ┌──────────────────────────────┐
   │   Workday    │ ────────────────▶ │  OrgSense backend + datastore │
   │ (HR SoR)     │  workers, orgs,   │  (replaces localStorage)      │
   └─────────────┘  titles, mgrs      │                               │
                                       │  • person "skeletons"         │
   ┌─────────────┐   nightly / live    │    (described: false)         │
   │ Microsoft    │ ────────────────▶ │  • team skeletons from orgs    │
   │ 365 / Teams  │  Graph: contact,   │  • official fields             │
   │ (Entra ID)   │  presence, groups  └───────────────┬───────────────┘
   └─────────────┘                                      │
          ▲                                             │  reads/writes
          │  self-service (Adaptive Cards)              ▼
   ┌──────┴───────┐   "what I do" /            ┌──────────────────────┐
   │  Teams bot / │ ─── team API ────────────▶ │  OrgSense chat UI      │
   │  personal tab│                            │  (web + Teams tab)     │
   └──────────────┘                            │  server-side Claude    │
                                               │  for search + parsing  │
                                               └──────────────────────┘
```

**Production note:** the two things the POC does client-side must move
server-side in production: (1) storage — swap `localStorage` for a real API +
datastore so profiles are shared org-wide, not per-browser; (2) the AI — the
Anthropic API key lives on the server, never in the browser (the POC's
"bring-your-own-key" toggle exists only because a static site has no server).

---

## 1. Workday — the official org structure & contact info

Workday is the system of record for who works here, their business title, which
**supervisory organization** they sit in, their manager (→ the reporting tree),
and their work contact details. A nightly job pulls this and **upserts person
skeletons** (and seeds team records from supervisory orgs).

### Integration options (pick one)

| Option | Best for | Notes |
| --- | --- | --- |
| **RaaS (Reports as a Service)** | Fastest path to a worker roster | Build a custom "Worker" report in Workday, enable it as a web service; it returns JSON/CSV/XML at a stable URL. Simplest to consume. |
| **Workday Web Services (SOAP)** | Rich, structured HR data | `Human_Resources` WSDL, `Get_Workers` operation → worker data incl. org assignments and full management chain. More capable, more complex. |
| **Workday REST API (`/ccx/api/...`) / Workday Extend** | Modern REST consumers | Growing coverage of Staffing/Common. Good if you want REST + OAuth without SOAP. |
| **EIB export** | Batch / file drop | Scheduled CSV export if you'd rather ingest a nightly file than call an API. |

**Recommended for v1:** a **RaaS "Worker" report** — it's the least-effort way to
get the roster + hierarchy, and you can add fields without code changes.

### Auth

Create a Workday **Integration System User (ISU)** and an **Integration System
Security Group** with domain access to the report/web service. Authenticate with
**OAuth 2.0 (client credentials)** or Basic auth using the ISU. This is set up by
a Workday administrator.

### Fields to map

| OrgSense person field | Workday source |
| --- | --- |
| `name` | Preferred/Legal Name |
| `officialTitle` | **Business Title** |
| `department` | **Supervisory Organization** (or Cost Center) |
| `contact.email` | Work Email |
| `contact.phone` | Work Phone |
| `contact.workdayId` | **Employee ID** (stable key for upserts) |
| `location` | Work Location |
| `managerId` *(new field)* | Manager (from the management chain) → the reporting tree |
| `described` | Always `false` on import — the person fills in the functional layer |

The **supervisory-org hierarchy** is your official structure, and each
supervisory org is a natural seed for a **team** record (name + membership).
People self-describe the functional layer; team leads publish the Team API on
top.

---

## 2. Microsoft 365 / Teams — enrichment & self-service

Microsoft Graph is the enrichment and engagement layer. Two directions:

### 2a. Pull FROM Teams/M365 (enrich contact info + map teams)

Use **Microsoft Graph** to enrich the skeleton with the things people actually
use to reach each other, and to map functional teams to real Microsoft 365
groups / Teams:

| Graph call | Gives you |
| --- | --- |
| `GET /v1.0/users` · `/users/{id}` | displayName, jobTitle, department, mail, mobilePhone, businessPhones, officeLocation, employeeId |
| `GET /users/{id}/manager` · `/directReports` | reporting line (cross-check with Workday) |
| `GET /users/{id}/photo/$value` | profile photo |
| `GET /users/{id}/presence` | live Teams availability ("is this person free right now?") |
| `GET /groups` · `/teams` · `/teams/{id}/channels` · `/groups/{id}/members` | map a functional team to its Microsoft 365 group / Teams team + membership |

| OrgSense field | Graph source |
| --- | --- |
| `contact.teams` | userPrincipalName / mail (the Teams @handle) |
| `contact.phone` | mobilePhone / businessPhones |
| `contact.email` | mail |
| `officialTitle` / `department` | jobTitle / department *(fallback if not from Workday)* |
| `location` | officeLocation |
| `photo`, `presence` *(new)* | `/photo/$value`, `/presence` |
| team `memberIds` | `/groups/{id}/members` |

### 2b. Let people update FROM inside Teams (populate the profile cards)

This is the "populate the profile cards with information people add" piece —
run the "describe what you do" flow **inside Teams** so people don't have to
leave it:

- **Teams bot** — build with the **Bot Framework / Microsoft 365 Agents SDK**
  (Teams Toolkit). The bot runs the same conversational "tell me what you do"
  flow, using **Adaptive Cards** for the structured profile (role,
  responsibilities, skills, projects), and posts the result to the OrgSense
  backend. A team lead can be prompted the same way to publish the **Team API**.
- **Teams personal tab / message extension** — embed the OrgSense web app as a
  personal tab so the existing chat UI runs *inside* Teams, with **SSO via Entra
  ID** (the signed-in Teams user is the persona — no separate login). A message
  extension lets people search "who does X?" from any chat's compose box.

### Auth (Microsoft Entra ID)

Register an app in **Microsoft Entra ID (Azure AD)**:

- **Application permissions** (app-only, client-credentials, **admin consent
  required**) for the nightly directory sync:
  `User.Read.All`, `Directory.Read.All`, `Group.Read.All`, `TeamMember.Read.All`.
- **Delegated permissions** (on-behalf-of the signed-in user) for the Teams
  bot/tab self-service and presence: `User.Read`, `Presence.Read`.

---

## 3. Reconciling the two sources

Where Workday and Graph overlap (title, department, manager), decide which wins:

- **Official HR facts** (business title, department, employment status, reporting
  line) → **Workday** is authoritative.
- **Collaboration signals** (Teams handle, presence, photo, group membership) →
  **Graph/Teams** is authoritative.
- **The functional layer** (what you *do*, the Team API) → **the person / team
  lead** owns it. Sync never overwrites it.

Practical rules: key person records on Workday **Employee ID** (`contact.workdayId`)
for stable upserts; **deactivate** (don't hard-delete) records when Workday marks
a worker inactive, so history is preserved; respect Workday privacy flags (e.g.
unlisted numbers) and don't surface non-work contact info.

---

## Where the POC is already shaped for this

The code has deliberate seams so this drops in without a rewrite:

- **The person schema already matches the sources.** In [`js/data.js`](js/data.js),
  each person has `officialTitle`, `department`, `location`, `contact.email`,
  `contact.phone`, `contact.teams`, and **`contact.workdayId`** — these are 1:1
  targets for a Workday/Graph sync. `workdayId` is literally the Workday key;
  `contact.teams` is the Teams handle slot.
- **`described: false` skeletons *are* the "imported, not yet self-described"
  state.** A Workday sync job just creates/updates these records; the coverage
  stat already visualizes the gap.
- **Teams are modeled the same way.** Team records have `type`, `mission`,
  `provides`, `engage`, and `memberIds`. `memberIds` can be seeded from Workday
  supervisory orgs or M365 group membership; the Team API fields are the
  human-published living layer. One seed team is intentionally left
  `described: false` to show the "no Team API yet" state.
- **The engine is a clean swap point.** `OrgEngine.search()` /
  `OrgEngine.searchTeams()` in [`js/engine.js`](js/engine.js) are the only search
  entry points. Replace their bodies with a call to your backend (which runs
  real Claude with a **server-side** key). The existing "bring-your-own-key"
  toggle already demonstrates the exact Messages API request shape — production
  just moves the key server-side.
- **Storage is the other swap point.** The `OrgData` layer in `js/data.js` wraps
  all reads/writes (`getPeople`, `upsertPerson`, `getTeams`, …). Point those at
  `fetch` calls to your API instead of `localStorage` and the UI is unchanged.

---

## Caveats & governance

- **Privacy / FERPA / PII.** Keep this to the staff directory; restrict who can
  see what; never surface student data or home contact info. Have the data
  owners review before any real sync.
- **Ownership & editing.** Only a person edits their own functional profile; only
  a team lead publishes/edits a Team API. Entra ID group membership can gate
  this.
- **Admin consent & setup.** Graph application permissions need an Entra admin;
  Workday needs an ISU + security group from a Workday admin. Neither is
  self-service.
- **Rate limits & scale.** Microsoft Graph throttles (HTTP 429 + `Retry-After`) —
  use delta queries where possible. Prefer incremental/delta pulls from Workday
  over full-roster scans.

---

_This is a design reference generated with AI assistance; see
[AI-DISCLOSURE.md](AI-DISCLOSURE.md). Verify current Workday and Microsoft Graph
API details against the official docs before building — API surfaces change._
