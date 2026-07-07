/*
 * app.js — UI + interaction logic for OrgSense (POC)
 * Vanilla JS, no framework. Talks to OrgData (storage) and OrgEngine (search).
 */
(function () {
  "use strict";

  var chatInner, chatScroll, chatInput, composerForm;
  var currentUser = null;
  // If sign-in is triggered by an action that needs a persona (e.g. "Update my
  // information"), we stash that action here and resume it after they pick.
  var pendingAfterLogin = null;

  // ---- Small utilities ---------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function firstName(name) { return String(name || "there").split(" ")[0]; }
  function scrollToBottom() { chatScroll.scrollTop = chatScroll.scrollHeight; }

  // ---- Chat message rendering -------------------------------------------
  function addMessage(role, contentNode) {
    var msg = el("div", "msg " + (role === "user" ? "msg-user" : "msg-bot"));
    var avatar = el("div", "msg-avatar", role === "user" ? "🙂" : "🧭");
    var body = el("div", "msg-body");
    if (typeof contentNode === "string") {
      body.appendChild(el("div", "msg-bubble", contentNode));
    } else {
      body.appendChild(contentNode);
    }
    msg.appendChild(avatar);
    msg.appendChild(body);
    chatInner.appendChild(msg);
    scrollToBottom();
    return body;
  }

  function botBubble(html) {
    var b = el("div", "msg-bubble", html);
    return b;
  }

  function showTyping() {
    var body = addMessage("bot", botBubble('<span class="typing"><span></span><span></span><span></span></span>'));
    return body.parentNode; // the .msg element, so we can remove it
  }

  // ---- Greeting ----------------------------------------------------------
  function greet() {
    var name = currentUser ? firstName(currentUser.name) : "there";
    var bubble = botBubble(
      "<p>Hi " + esc(name) + " 👋 I'm <strong>OrgSense</strong> — a living, functional org chart. " +
      "Instead of guessing what someone does from their title, you can just <strong>ask</strong>. " +
      "The catch: I only know what people have told me.</p>" +
      "<p>What would you like to do?</p>"
    );
    var chips = el("div", "chips");
    chips.appendChild(makeChip("✏️", "Update my information", function () { startUpdateFlow(); }));
    chips.appendChild(makeChip("🔎", "Find who does something", function () { promptExample("Who is responsible for Windows updates in the College of Engineering?"); }));
    chips.appendChild(makeChip("👥", "Find a team", function () { showTeamList(); }));
    chips.appendChild(makeChip("🗂️", "Browse the org", function () { openBrowse(); }));
    bubble.appendChild(chips);

    var samples = el("div", "chips");
    samples.appendChild(el("div", "muted small", "Sample questions to try:"));
    bubble.appendChild(samples);
    var s2 = el("div", "chips");
    ["Who handles MFA for students?",
     "Who can help with a phishing email?",
     "Who runs the HPC cluster?",
     "Who do I ask about software licensing?"
    ].forEach(function (q) {
      s2.appendChild(makeChip("💬", q, function () { runSearch(q); }));
    });
    bubble.appendChild(s2);

    addMessage("bot", bubble);
  }

  function makeChip(icon, label, onClick) {
    var c = el("button", "chip", '<span class="chip-icon">' + icon + "</span>" + esc(label));
    c.type = "button";
    c.addEventListener("click", onClick);
    return c;
  }

  function promptExample(text) {
    chatInput.value = text;
    chatInput.focus();
    autoGrow();
  }

  // ---- Intent routing ----------------------------------------------------
  var UPDATE_HINTS = /\b(update (my|profile|info)|my (profile|info|information)|add me|register me|i'?m the|i am the|i work on|i'?m responsible|this is what i do|what i do|edit my)\b/i;

  function handleSubmit(text) {
    text = text.trim();
    if (!text) return;
    addMessage("user", esc(text).replace(/\n/g, "<br>"));
    if (UPDATE_HINTS.test(text)) {
      // If they wrote a real description, seed the update flow with it.
      var seed = text.length > 40 ? text : "";
      startUpdateFlow(seed);
    } else {
      runSearch(text);
    }
  }

  // ---- Search flow -------------------------------------------------------
  function runSearch(query) {
    var typing = showTyping();
    var teamMatches = OrgEngine.searchTeams(query); // local, independent of AI toggle
    OrgEngine.search(query).then(function (res) {
      typing.remove();
      res.teams = teamMatches;
      renderSearchResults(query, res);
    }).catch(function (err) {
      typing.remove();
      addMessage("bot", botBubble("<p>Something went wrong searching: " + esc(err.message) + "</p>"));
    });
  }

  function renderSearchResults(query, res) {
    var bubble = el("div", "msg-bubble");
    var results = res.results || [];
    var teamHits = (res.teams || []).filter(function (t) { return !t.skeleton; });
    // Only surface a team when the match is meaningful (not an incidental hit).
    var topTeam = (teamHits[0] && teamHits[0].score >= 5) ? teamHits[0].team : null;

    if (res.fellBack) {
      bubble.appendChild(el("p", "muted small", "⚠️ Real-AI request failed (" + esc(res.error || "") + ") — showing local matches instead."));
    }

    if (!results.length && !topTeam) {
      bubble.appendChild(el("p", null, "I searched every described role and every team's Team API for <strong>" + esc(query) + "</strong>."));
      bubble.appendChild(el("div", "empty-state",
        "<strong>No one has told me they do that yet.</strong><br>" +
        "That's the honest answer — this only works when people and teams describe themselves. " +
        "If <em>you</em> do this, click <strong>Update my information</strong> and it'll be findable next time."));
      addMessage("bot", bubble);
      return;
    }

    if (topTeam) {
      bubble.appendChild(el("p", null, "🧩 The team that provides this — and how to engage it:"));
      bubble.appendChild(renderTeamCard(topTeam));
    }

    if (results.length) {
      var lead = topTeam
        ? "And the people whose described work matches:"
        : (results.length === 1
            ? "Here's who best matches <strong>" + esc(query) + "</strong>:"
            : "Here are the closest matches for <strong>" + esc(query) + "</strong>:");
      bubble.appendChild(el("p", null, lead));
      results.forEach(function (r) { bubble.appendChild(renderPersonCard(r)); });
    }

    if (res.engine === "claude") {
      bubble.appendChild(el("div", "result-why", "People matched using Claude (" + esc(OrgData.loadSettings().model) + ")."));
    }
    addMessage("bot", bubble);
  }

  function renderPersonCard(r) {
    var p = r.person;
    var card = el("div", "result-card");
    card.appendChild(el("div", "result-name", esc(p.name)));

    if (r.skeleton) {
      card.appendChild(el("div", "result-role", esc(p.officialTitle)));
      card.appendChild(el("div", "result-meta",
        "This person exists in the directory, but <strong>hasn't described what they do</strong>, so I can't confirm they own this. " +
        "Their official title is all I have."
      ));
    } else {
      card.appendChild(el("div", "result-role", esc(p.functionalRole || p.officialTitle)));
      var meta = "";
      if (p.team) meta += '<span class="k">Team:</span> ' + esc(p.team) + "<br>";
      if (p.servesUnit) meta += '<span class="k">Works with:</span> ' + esc(p.servesUnit) + "<br>";
      if (p.officialTitle) meta += '<span class="k">Official title:</span> ' + esc(p.officialTitle);
      card.appendChild(el("div", "result-meta", meta));
    }

    card.appendChild(renderContact(p));

    // Why it matched
    if (r.reason) {
      card.appendChild(el("div", "result-why", "Why: " + esc(r.reason)));
    } else if (r.matched && r.matched.length) {
      var why = el("div", "result-why", "Matched on: ");
      r.matched.slice(0, 6).forEach(function (t) {
        why.appendChild(el("span", "match-tag", esc(t)));
      });
      card.appendChild(why);
    }
    return card;
  }

  function renderContact(p) {
    var c = p.contact || {};
    var line = el("div", "contact-line");
    if (c.email) line.appendChild(el("span", null, '📧 <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>"));
    if (c.phone) line.appendChild(el("span", null, "📞 " + esc(c.phone)));
    if (c.teams) line.appendChild(el("span", null, "💬 Teams: " + esc(c.teams)));
    if (p.location) line.appendChild(el("span", null, "📍 " + esc(p.location)));
    return line;
  }

  // ---- Team API cards (Team Topologies) ----------------------------------
  var MODE_LABELS = { "self-service": "Self-service", "request": "Request", "collaborate": "Collaborate" };

  function renderTeamCard(team) {
    var card = el("div", "team-card");
    var head = el("div", "team-card-head");
    head.appendChild(el("div", "result-name", esc(team.name)));
    var tt = OrgData.TEAM_TYPES[team.type];
    if (tt) head.appendChild(el("span", "team-badge team-badge--" + team.type, esc(tt.label)));
    card.appendChild(head);

    if (!team.described) {
      card.appendChild(el("div", "result-meta",
        "This team is in the directory, but <strong>hasn't published its Team API yet</strong> — so I can't tell you what it provides or how to engage it."));
    } else {
      if (tt) card.appendChild(el("div", "team-type-blurb muted small", esc(tt.label) + " team — " + esc(tt.blurb)));
      if (team.mission) card.appendChild(el("div", "team-mission", esc(team.mission)));

      if (team.provides && team.provides.length) {
        card.appendChild(el("div", "team-subhead", "What we provide · how to engage"));
        var list = el("div", "provides-list");
        team.provides.forEach(function (p) {
          var row = el("div", "provide-row");
          row.appendChild(el("span", "provide-mode provide-mode--" + p.how, esc(MODE_LABELS[p.how] || p.how)));
          row.appendChild(el("span", "provide-what", esc(p.what)));
          if (p.detail) row.appendChild(el("span", "provide-detail", " — " + esc(p.detail)));
          list.appendChild(row);
        });
        card.appendChild(list);
      }

      if (team.engage) {
        var e = team.engage;
        var meta = "";
        if (e.channel) meta += '<span class="k">Reach us:</span> ' + esc(e.channel) + "<br>";
        if (e.queue) meta += '<span class="k">Requests:</span> ' + esc(e.queue) + "<br>";
        if (e.hours) meta += '<span class="k">Hours:</span> ' + esc(e.hours) + "<br>";
        if (e.sla) meta += '<span class="k">SLA:</span> ' + esc(e.sla);
        if (meta) card.appendChild(el("div", "result-meta", meta));
      }
    }

    var members = (team.memberIds || []).map(function (id) { return OrgData.getPersonById(id); }).filter(Boolean);
    if (members.length) {
      var m = el("div", "team-members");
      var parts = members.map(function (p) {
        var role = p.functionalRole || p.officialTitle;
        return esc(p.name) + (role ? ' <span class="muted">(' + esc(role) + ')</span>' : "");
      });
      m.innerHTML = '<span class="k">Team members:</span> ' + parts.join(", ");
      card.appendChild(m);
    }
    return card;
  }

  function showTeamList() {
    var teams = OrgData.getTeams().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var cov = OrgData.teamCoverage();
    var bubble = el("div", "msg-bubble");
    bubble.appendChild(el("p", null,
      "Here are the teams. Pick one to see its <strong>Team API</strong> — what it provides and how to engage it. " +
      '<span class="muted">(' + esc(cov.described) + " of " + esc(cov.total) + " have published one.)</span>"));
    var chips = el("div", "chips");
    teams.forEach(function (t) {
      var label = t.name + (t.described ? "" : " · no API yet");
      chips.appendChild(makeChip("🧩", label, function () {
        addMessage("user", esc("Show me the " + t.name + " team"));
        var b = el("div", "msg-bubble");
        b.appendChild(renderTeamCard(t));
        addMessage("bot", b);
      }));
    });
    bubble.appendChild(chips);
    addMessage("bot", bubble);
  }

  // ---- Update (describe → parse → save) flow -----------------------------
  function startUpdateFlow(seedText) {
    if (!currentUser) {
      pendingAfterLogin = function () { startUpdateFlow(seedText); };
      openLogin();
      return;
    }

    var intro = botBubble(
      "<p>Let's update <strong>" + esc(currentUser.name) + "</strong>'s profile " +
      "(<span class=\"muted\">" + esc(currentUser.officialTitle) + "</span>).</p>" +
      "<p>Describe what you do in plain language — responsibilities, systems you work on, teams, projects. " +
      "I'll turn it into a structured profile you can tidy up.</p>"
    );
    addMessage("bot", intro);

    var card = el("div", "profile-card");
    card.innerHTML =
      '<h4>Tell me what you do</h4>' +
      '<textarea class="describe-area" id="describeArea" placeholder="e.g. I\'m the Deputy CISO. I\'m responsible for our vulnerability management program and I run the security operations team. I work on the Zero Trust project and I handle third-party risk reviews."></textarea>' +
      '<div class="card-actions">' +
        '<button class="btn btn-primary" id="parseBtn" type="button">✨ Turn this into a profile</button>' +
      '</div>' +
      '<div class="parse-note muted small"></div>' +
      '<div id="structured"></div>';

    var body = addMessage("bot", card);
    body.classList.add("wide"); // fill the row like the text bubbles
    var textarea = card.querySelector("#describeArea");
    if (seedText) textarea.value = seedText;
    // Pre-fill from an existing described profile so edits are additive.
    else if (currentUser.summary) textarea.value = currentUser.summary;

    card.querySelector("#parseBtn").addEventListener("click", function () {
      var text = textarea.value.trim();
      if (!text) { textarea.focus(); return; }
      var note = card.querySelector(".parse-note");
      note.textContent = "Parsing…";
      OrgEngine.parseSelfDescription(text).then(function (parsed) {
        note.textContent = parsed.fellBack
          ? "⚠️ Real-AI parse failed (" + (parsed.error || "") + ") — used the local parser."
          : (OrgData.loadSettings().useRealAI ? "Parsed with Claude. Edit anything that's off." : "Parsed locally. Edit anything that's off — this is a first pass.");
        renderStructuredEditor(card.querySelector("#structured"), parsed, text);
      });
    });
  }

  function renderStructuredEditor(container, parsed, rawText) {
    container.innerHTML = "";
    var wrap = el("div", "step");

    wrap.appendChild(el("label", "field-label", "Functional role (what you'd want people to find you by)"));
    var roleInput = el("input", "input");
    roleInput.type = "text";
    roleInput.value = parsed.functionalRole || "";
    roleInput.placeholder = "e.g. Deputy CISO — Security Operations";
    wrap.appendChild(roleInput);

    var respEditor = tagEditor("Responsibilities", parsed.responsibilities || [], "Add a responsibility…");
    var skillEditor = tagEditor("Skills / systems", parsed.skills || [], "Add a skill…");
    var projEditor = tagEditor("Projects", parsed.projects || [], "Add a project…");
    wrap.appendChild(respEditor.node);
    wrap.appendChild(skillEditor.node);
    wrap.appendChild(projEditor.node);

    var actions = el("div", "card-actions");
    var saveBtn = el("button", "btn btn-primary", "💾 Save my profile");
    saveBtn.type = "button";
    actions.appendChild(saveBtn);
    wrap.appendChild(actions);
    container.appendChild(wrap);

    saveBtn.addEventListener("click", function () {
      var updated = Object.assign({}, currentUser, {
        functionalRole: roleInput.value.trim(),
        responsibilities: respEditor.getValues(),
        skills: skillEditor.getValues(),
        projects: projEditor.getValues(),
        summary: rawText.trim(),
        described: true,
        updatedAt: new Date().toISOString()
      });
      OrgData.upsertPerson(updated);
      currentUser = updated;
      OrgData.setCurrentUserId(updated.id);
      refreshCoverage();
      saveBtn.disabled = true;
      saveBtn.textContent = "✓ Saved";

      var done = botBubble(
        "<p>Saved. ✅ <strong>" + esc(updated.name) + "</strong> is now findable as " +
        "<strong>" + esc(updated.functionalRole || "described") + "</strong>.</p>" +
        "<p>Try searching for something you just entered to see it come back:</p>"
      );
      var chips = el("div", "chips");
      var seedTerm = (updated.functionalRole || (updated.responsibilities[0] || "your role"));
      chips.appendChild(makeChip("🔎", "Who is the " + seedTerm + "?", function () {
        runSearch("Who is the " + seedTerm + "?");
      }));
      if (updated.responsibilities[0]) {
        chips.appendChild(makeChip("🔎", "Who handles " + updated.responsibilities[0] + "?", function () {
          runSearch("Who handles " + updated.responsibilities[0] + "?");
        }));
      }
      done.appendChild(chips);
      addMessage("bot", done);
    });
  }

  // A small add/remove tag editor. Returns { node, getValues }.
  function tagEditor(label, initial, placeholder) {
    var values = (initial || []).slice();
    var node = el("div", "step");
    node.appendChild(el("label", "field-label", esc(label)));
    var list = el("div", "tag-list");
    node.appendChild(list);

    function render() {
      list.innerHTML = "";
      values.forEach(function (v, i) {
        var tag = el("span", "tag", "<span>" + esc(v) + "</span>");
        var x = el("button", null, "✕");
        x.type = "button";
        x.addEventListener("click", function () { values.splice(i, 1); render(); });
        tag.appendChild(x);
        list.appendChild(tag);
      });
    }
    render();

    var addRow = el("div", "tag-add");
    var input = el("input", "input");
    input.type = "text";
    input.placeholder = placeholder;
    var addBtn = el("button", "btn btn-ghost", "Add");
    addBtn.type = "button";
    function add() {
      var v = input.value.trim();
      if (v) { values.push(v); input.value = ""; render(); input.focus(); }
    }
    addBtn.addEventListener("click", add);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    node.appendChild(addRow);

    return { node: node, getValues: function () { return values.slice(); } };
  }

  // ---- Browse panel ------------------------------------------------------
  function openBrowse() {
    var people = OrgData.getPeople();
    var cov = OrgData.coverage();
    var tcov = OrgData.teamCoverage();
    document.getElementById("browseSummary").innerHTML =
      esc(cov.described) + " of " + esc(cov.total) + " people (" + esc(cov.percent) + "%) have described what they do, and " +
      esc(tcov.described) + " of " + esc(tcov.total) + " teams have published a Team API. " +
      "Greyed-out rows haven't — so they can't be found by function yet.";

    var listEl = document.getElementById("browseList");
    listEl.innerHTML = "";

    // Teams first (the Team Topologies view), then people grouped by department.
    listEl.appendChild(el("div", "browse-group-title", "Teams"));
    OrgData.getTeams().slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (t) {
      var row = el("div", "browse-row" + (t.described ? "" : " skeleton"));
      var tt = OrgData.TEAM_TYPES[t.type];
      var nameHtml = esc(t.name);
      if (tt) nameHtml += ' <span class="team-badge team-badge--' + t.type + '">' + esc(tt.label) + "</span>";
      if (!t.described) nameHtml += '<span class="pill-undescribed">no Team API</span>';
      row.appendChild(el("div", "bn", nameHtml));
      row.appendChild(el("div", "br", esc(t.described && t.provides[0] ? t.provides[0].what : "")));
      listEl.appendChild(row);
    });

    var groups = {};
    people.forEach(function (p) {
      var d = p.department || "Other";
      (groups[d] = groups[d] || []).push(p);
    });
    Object.keys(groups).sort().forEach(function (dept) {
      listEl.appendChild(el("div", "browse-group-title", esc(dept)));
      groups[dept].sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (p) {
        var row = el("div", "browse-row" + (p.described ? "" : " skeleton"));
        var nameHtml = esc(p.name);
        if (!p.described) nameHtml += '<span class="pill-undescribed">undescribed</span>';
        row.appendChild(el("div", "bn", nameHtml));
        row.appendChild(el("div", "br", esc(p.described ? (p.functionalRole || p.officialTitle) : p.officialTitle)));
        listEl.appendChild(row);
      });
    });

    show("browseOverlay");
  }

  // ---- Login (demo) ------------------------------------------------------
  function openLogin() {
    var sel = document.getElementById("loginSelect");
    sel.innerHTML = "";
    // Start with nothing chosen — don't pick a persona for them.
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— Choose a persona —";
    sel.appendChild(placeholder);
    var people = OrgData.getPeople().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    people.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name + " — " + p.officialTitle + (p.described ? "" : " (undescribed)");
      sel.appendChild(o);
    });
    var addOpt = document.createElement("option");
    addOpt.value = "__new__";
    addOpt.textContent = "➕ Add me as a new person…";
    sel.appendChild(addOpt);
    show("loginOverlay");
  }

  function confirmLogin() {
    var sel = document.getElementById("loginSelect");
    var id = sel.value;
    if (!id) { sel.focus(); return; } // placeholder still selected — wait for a real choice
    if (id === "__new__") {
      var name = window.prompt("Your name:");
      if (!name) return;
      var title = window.prompt("Your official title (e.g. IT Professional I):", "IT Professional I") || "Staff";
      var person = {
        id: OrgData.newId(name),
        name: name.trim(),
        officialTitle: title.trim(),
        functionalRole: "", team: "", department: "Office of Information Technology",
        servesUnit: "", location: "",
        summary: "", responsibilities: [], skills: [], projects: [],
        contact: { email: name.trim().toLowerCase().replace(/[^a-z]+/g, ".") + "@northgate.edu", phone: "", teams: "", workdayId: "" },
        described: false, updatedAt: null
      };
      OrgData.upsertPerson(person);
      currentUser = person;
    } else {
      currentUser = OrgData.getPersonById(id);
    }
    OrgData.setCurrentUserId(currentUser.id);
    hide("loginOverlay");
    renderWhoami();
    refreshCoverage();
    if (pendingAfterLogin) {
      var resume = pendingAfterLogin;
      pendingAfterLogin = null;
      resume();
    }
  }

  function renderWhoami() {
    var w = document.getElementById("whoami");
    w.textContent = currentUser ? "Signed in: " + firstName(currentUser.name) : "Sign in";
  }

  // ---- Settings ----------------------------------------------------------
  function openSettings() {
    var s = OrgData.loadSettings();
    document.getElementById("useRealAI").checked = !!s.useRealAI;
    document.getElementById("apiKey").value = s.apiKey || "";
    document.getElementById("modelSelect").value = s.model || "claude-opus-4-8";
    document.getElementById("realAIFields").hidden = !s.useRealAI;
    document.getElementById("testKeyResult").textContent = "";
    show("settingsOverlay");
  }

  function persistSettingsFromUI() {
    var s = {
      useRealAI: document.getElementById("useRealAI").checked,
      apiKey: document.getElementById("apiKey").value.trim(),
      model: document.getElementById("modelSelect").value
    };
    OrgData.saveSettings(s);
    refreshEngineHint();
    return s;
  }

  function refreshEngineHint() {
    var s = OrgData.loadSettings();
    var hint = document.getElementById("engineHint");
    hint.textContent = s.useRealAI && s.apiKey
      ? "Search is using real Claude (" + s.model + "). This is a proof of concept — data lives only in this browser."
      : "Local matching engine (no API key needed). This is a proof of concept — data lives only in this browser.";
  }

  // ---- Coverage ----------------------------------------------------------
  function refreshCoverage() {
    var cov = OrgData.coverage();
    document.getElementById("coverageNum").textContent = cov.described + "/" + cov.total + " · " + cov.percent + "%";
  }

  // ---- Overlay helpers ---------------------------------------------------
  function show(id) { document.getElementById(id).hidden = false; }
  function hide(id) { document.getElementById(id).hidden = true; }

  // ---- Composer auto-grow ------------------------------------------------
  function autoGrow() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
  }

  // ---- Wire everything ---------------------------------------------------
  function init() {
    chatInner = document.getElementById("chatInner");
    chatScroll = document.getElementById("chatScroll");
    chatInput = document.getElementById("chatInput");
    composerForm = document.getElementById("composerForm");

    refreshCoverage();
    refreshEngineHint();

    // Start signed out on every load — don't pick a persona for anyone.
    // (Entered profile data still persists; only the "who am I" resets.)
    OrgData.setCurrentUserId("");
    currentUser = null;
    renderWhoami();

    composerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = chatInput.value;
      chatInput.value = "";
      autoGrow();
      handleSubmit(text);
    });
    chatInput.addEventListener("input", autoGrow);
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); composerForm.requestSubmit(); }
    });

    document.getElementById("browseBtn").addEventListener("click", openBrowse);
    document.getElementById("settingsBtn").addEventListener("click", openSettings);
    document.getElementById("loginConfirm").addEventListener("click", confirmLogin);
    document.getElementById("whoami").addEventListener("click", openLogin);

    // Close buttons on overlays
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (btn) {
      btn.addEventListener("click", function () { hide(btn.getAttribute("data-close")); });
    });
    // Click outside modal closes it (login can now be dismissed too).
    ["browseOverlay", "settingsOverlay", "loginOverlay"].forEach(function (id) {
      document.getElementById(id).addEventListener("click", function (e) {
        if (e.target === this) hide(id);
      });
    });

    // Settings interactions
    document.getElementById("useRealAI").addEventListener("change", function () {
      document.getElementById("realAIFields").hidden = !this.checked;
      persistSettingsFromUI();
    });
    document.getElementById("apiKey").addEventListener("change", persistSettingsFromUI);
    document.getElementById("modelSelect").addEventListener("change", persistSettingsFromUI);

    document.getElementById("testKeyBtn").addEventListener("click", function () {
      var s = persistSettingsFromUI();
      var out = document.getElementById("testKeyResult");
      out.textContent = "Testing…"; out.className = "test-result";
      if (!s.apiKey) { out.textContent = "Enter a key first."; out.className = "test-result err"; return; }
      OrgEngine.testKey(s).then(function () {
        out.textContent = "✓ Key works"; out.className = "test-result ok";
      }).catch(function (err) {
        out.textContent = "✕ " + err.message; out.className = "test-result err";
      });
    });

    document.getElementById("exportBtn").addEventListener("click", function () {
      var blob = new Blob([OrgData.exportJSON()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "orgsense-data.json";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
    document.getElementById("importBtn").addEventListener("click", function () {
      document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          OrgData.importJSON(reader.result);
          refreshCoverage();
          hide("settingsOverlay");
          addMessage("bot", botBubble("<p>Imported data. The org now reflects your file.</p>"));
        } catch (err) {
          alert("Import failed: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    document.getElementById("resetBtn").addEventListener("click", function () {
      if (!confirm("Reset to the fictional sample data? This clears anything you've entered in this browser.")) return;
      OrgData.resetToSeed();
      var uid = OrgData.getCurrentUserId();
      currentUser = uid ? OrgData.getPersonById(uid) : null;
      if (!currentUser) OrgData.setCurrentUserId("");
      renderWhoami();
      refreshCoverage();
      hide("settingsOverlay");
      addMessage("bot", botBubble("<p>Reset done — back to the sample organization.</p>"));
    });
    document.getElementById("switchUserBtn").addEventListener("click", function () {
      hide("settingsOverlay");
      openLogin();
    });

    // Greet. No forced login — people choose a persona from the top-right chip.
    greet();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
