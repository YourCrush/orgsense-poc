/*
 * engine.js — The "AI" for OrgSense (POC)
 *
 * Two engines, same interface:
 *   1. Simulated (default): deterministic keyword + synonym matching over the
 *      profiles people have filled in. No network, no key, works offline.
 *   2. Real Claude (optional): if the user pastes an Anthropic API key in
 *      Settings, search + profile-parsing route through the real model via a
 *      direct browser call to the Messages API.
 *
 * The simulated engine is intentionally transparent — it reports WHICH terms
 * matched, so a demo audience can see why a result came back.
 */
(function () {
  "use strict";

  // ---- Synonym expansion -------------------------------------------------
  // Maps a canonical term to the words people might actually type. Used to
  // bridge "what a person wrote" and "what a searcher asks".
  var SYNONYMS = {
    "windows update": ["patch", "patching", "patch management", "updates", "sccm", "intune", "wsus", "endpoint", "os update", "software update"],
    "endpoint": ["laptop", "computer", "desktop", "workstation", "device", "machine", "pc"],
    "mfa": ["multi-factor", "multifactor", "two-factor", "2fa", "authentication", "authenticator", "duo"],
    "sso": ["single sign-on", "single signon", "okta", "saml", "login", "log in", "sign in", "sign-in"],
    "vpn": ["remote access", "off-campus"],
    "phishing": ["email security", "awareness", "social engineering", "phish", "training", "spam"],
    "password": ["reset", "account", "credentials", "locked out", "lockout", "help desk", "helpdesk", "service desk"],
    "security": ["cybersecurity", "cyber security", "infosec", "information security", "ciso", "soc"],
    "incident": ["breach", "incident response", "attack", "ransomware", "compromise", "alert"],
    "network": ["wifi", "wi-fi", "wireless", "internet", "connectivity", "firewall", "dns", "dhcp", "ethernet"],
    "privacy": ["ferpa", "gdpr", "data protection", "data privacy", "compliance", "records", "retention"],
    "cloud": ["aws", "amazon web services", "azure", "gcp", "terraform", "kubernetes"],
    "hr": ["workday", "human resources", "personnel", "org chart", "hris", "onboarding", "position"],
    "web": ["website", "portal", "web app", "front-end", "frontend", "javascript", "react", "accessibility", "wcag"],
    "research": ["hpc", "high performance computing", "cluster", "slurm", "grant", "research data"],
    "av": ["audio visual", "audio-visual", "classroom", "projector", "zoom room", "lecture capture", "event"],
    "procurement": ["purchasing", "license", "licensing", "software license", "vendor", "contract", "renewal", "saas"],
    "college of engineering": ["engineering", "coe", "riggs"],
    "identity": ["iam", "provisioning", "deprovisioning", "access", "account management"]
  };

  // Fields to search, with relative weights. Higher weight = a hit there
  // matters more.
  var FIELD_WEIGHTS = {
    functionalRole: 6,
    responsibilities: 5,
    skills: 4,
    projects: 3,
    summary: 3,
    team: 3,
    servesUnit: 3,
    department: 2,
    officialTitle: 1,
    name: 5
  };

  var STOPWORDS = {
    "the": 1, "a": 1, "an": 1, "who": 1, "is": 1, "are": 1, "for": 1, "of": 1,
    "in": 1, "on": 1, "at": 1, "to": 1, "and": 1, "or": 1, "with": 1, "responsible": 1,
    "handles": 1, "handle": 1, "does": 1, "do": 1, "manages": 1, "manage": 1, "our": 1,
    "someone": 1, "person": 1, "people": 1, "team": 1, "find": 1, "me": 1, "i": 1, "need": 1,
    "looking": 1, "whos": 1, "charge": 1, "about": 1, "help": 1, "can": 1, "how": 1, "what": 1,
    // Generic org/title noise — these dilute matching if allowed to match alone.
    // (e.g. "management" appears in half the profiles; the meaningful word is the
    // noun in front of it.) Multi-word synonym phrases are matched separately, so
    // dropping these single tokens doesn't hurt real matches.
    "management": 1, "operations": 1, "coordinator": 1, "specialist": 1,
    "professional": 1, "associate": 1, "administration": 1, "administrator": 1,
    "ii": 1, "iii": 1
  };

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function tokenize(text) {
    var norm = normalize(text);
    if (!norm) return [];
    var raw = norm.split(" ");
    var tokens = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (!w || STOPWORDS[w] || w.length < 2) continue;
      tokens.push(w);
    }
    return tokens;
  }

  // Expand a normalized query into a set of search terms (single words +
  // multi-word phrases from the synonym map that appear in the query).
  function expandQuery(query) {
    var norm = normalize(query);
    var terms = {};
    var tokens = tokenize(query);
    for (var i = 0; i < tokens.length; i++) terms[tokens[i]] = true;

    // Add synonyms: if the query contains a canonical term OR any of its
    // synonyms, add the whole family so a searcher and a describer meet.
    for (var canonical in SYNONYMS) {
      if (!Object.prototype.hasOwnProperty.call(SYNONYMS, canonical)) continue;
      var family = SYNONYMS[canonical].concat([canonical]);
      var hit = false;
      for (var j = 0; j < family.length; j++) {
        if (norm.indexOf(family[j]) !== -1) { hit = true; break; }
      }
      if (hit) {
        for (var k = 0; k < family.length; k++) terms[family[k]] = true;
      }
    }
    return Object.keys(terms);
  }

  function fieldText(person, field) {
    var v = person[field];
    if (Array.isArray(v)) return v.join(" ");
    return v || "";
  }

  // Score one person against expanded query terms. Returns { score, matched }.
  function scorePerson(person, terms) {
    var score = 0;
    var matched = {};
    for (var field in FIELD_WEIGHTS) {
      if (!Object.prototype.hasOwnProperty.call(FIELD_WEIGHTS, field)) continue;
      var haystack = normalize(fieldText(person, field));
      if (!haystack) continue;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        if (!term) continue;
        // Word-boundary-ish match to avoid "it" matching "security".
        var idx = haystack.indexOf(term);
        if (idx !== -1) {
          var before = idx === 0 ? " " : haystack.charAt(idx - 1);
          var after = idx + term.length >= haystack.length ? " " : haystack.charAt(idx + term.length);
          var boundaryOk = /[\s-]/.test(before) && /[\s-]/.test(after);
          if (boundaryOk || term.length >= 5) {
            score += FIELD_WEIGHTS[field];
            matched[term] = true;
          }
        }
      }
    }
    return { score: score, matched: Object.keys(matched) };
  }

  // ---- Simulated search --------------------------------------------------
  function simulatedSearch(query, options) {
    options = options || {};
    var people = window.OrgData.getPeople();
    var terms = expandQuery(query);
    var results = [];
    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      // Skeletons (not described) can only match on name — you can't find
      // someone by what they do if they never told the system.
      if (!p.described) {
        var nameScore = scorePerson({ name: p.name }, terms);
        if (nameScore.score > 0) {
          results.push({ person: p, score: nameScore.score, matched: nameScore.matched, skeleton: true });
        }
        continue;
      }
      var r = scorePerson(p, terms);
      if (r.score > 0) {
        results.push({ person: p, score: r.score, matched: r.matched, skeleton: false });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    var limit = options.limit || 5;
    return { engine: "simulated", terms: terms, results: results.slice(0, limit) };
  }

  // ---- Simulated free-text profile parser --------------------------------
  // Turns a plain-language self-description into structured fields (best
  // effort). Real Claude does this far better; this is the honest fallback.
  var KNOWN_SKILLS = [
    "Intune", "SCCM", "Windows", "PowerShell", "Autopilot", "Okta", "SAML", "SCIM",
    "Active Directory", "MFA", "Duo", "Cisco", "Palo Alto", "BGP", "Wi-Fi", "DNS",
    "FERPA", "GDPR", "Privacy", "Compliance", "ServiceNow", "ITIL", "AWS", "Azure",
    "Terraform", "Kubernetes", "Linux", "Splunk", "SIEM", "EDR", "Workday", "HRIS",
    "JavaScript", "React", "TypeScript", "Accessibility", "WCAG", "HPC", "Slurm",
    "Zoom Rooms", "Crestron", "Licensing", "Procurement", "Python", "SQL", "Phishing",
    "KnowBe4", "Incident response", "Threat hunting", "Firewall", "Tenable", "Nessus",
    "Vulnerability management", "Patch management", "Okta", "ServiceNow", "VPN"
  ];

  function parseSelfDescriptionSimulated(text) {
    var out = { functionalRole: "", responsibilities: [], skills: [], projects: [], summary: text.trim() };
    var norm = normalize(text);

    // Role: look for "I'm the X" / "I am the X" / "as the X" (case-insensitive,
    // straight or curly apostrophe).
    var roleMatch = text.match(/\b(?:i['’]?m|i am|as)\s+(?:the\s+|a\s+|an\s+)?([^.,;\n]{2,60})/i);
    if (roleMatch) {
      out.functionalRole = roleMatch[1].trim().replace(/\s+(and|who|that|responsible|in charge).*$/i, "").trim();
    }

    // Responsibilities: split on sentences and phrases that read like duties.
    var sentences = text.split(/[.\n;]+/);
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i].trim();
      if (!s) continue;
      if (/responsible for|i handle|i manage|i run|i work on|i own|i support|i lead|i maintain|in charge of/i.test(s)) {
        var cleaned = s
          .replace(/^.*?(responsible for|i handle|i manage|i run|i work on|i own|i support|i lead|i maintain|in charge of)\s*/i, "")
          .trim();
        if (cleaned) {
          // Split "A, B and C" into separate responsibilities.
          var parts = cleaned.split(/\s*,\s*|\s+and\s+/);
          for (var j = 0; j < parts.length; j++) {
            var part = parts[j].trim().replace(/^and\s+/i, "");
            if (part.length > 2) out.responsibilities.push(part.charAt(0).toUpperCase() + part.slice(1));
          }
        }
      }
    }

    // Skills: match known tech keywords anywhere in the text.
    for (var k = 0; k < KNOWN_SKILLS.length; k++) {
      if (norm.indexOf(normalize(KNOWN_SKILLS[k])) !== -1) out.skills.push(KNOWN_SKILLS[k]);
    }

    // Projects: sentences that mention "project" or "working on".
    for (var m = 0; m < sentences.length; m++) {
      var sm = sentences[m].trim();
      if (/project|rolling out|migrating|implementing|building/i.test(sm) && sm.length < 120) {
        out.projects.push(sm);
      }
    }

    return out;
  }

  // ---- Real Claude integration (optional) --------------------------------
  var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
  var ANTHROPIC_VERSION = "2023-06-01";

  function callClaude(settings, systemPrompt, userText) {
    var body = {
      model: settings.model || "claude-opus-4-8",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }]
    };
    return fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        // Required to call the Messages API directly from a browser.
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body)
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.text().then(function (t) {
          throw new Error("Claude API error " + resp.status + ": " + t.slice(0, 300));
        });
      }
      return resp.json();
    }).then(function (data) {
      if (data.stop_reason === "refusal") throw new Error("The model declined to answer this request.");
      var text = "";
      if (data.content && data.content.length) {
        for (var i = 0; i < data.content.length; i++) {
          if (data.content[i].type === "text") text += data.content[i].text;
        }
      }
      return text;
    });
  }

  function extractJSON(text) {
    // Models sometimes wrap JSON in prose or fences; grab the first {...} or [...].
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    var candidate = fence ? fence[1] : text;
    var start = candidate.search(/[\[{]/);
    if (start === -1) throw new Error("No JSON found in model response.");
    return JSON.parse(candidate.slice(start));
  }

  function realSearch(query) {
    var settings = window.OrgData.loadSettings();
    var people = window.OrgData.getPeople().filter(function (p) { return p.described; });
    var directory = people.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        role: p.functionalRole,
        team: p.team,
        unit: p.servesUnit,
        responsibilities: p.responsibilities,
        skills: p.skills,
        projects: p.projects
      };
    });
    var system =
      "You are a directory assistant for a university. You are given a JSON array of staff profiles and a natural-language question. " +
      "Return ONLY a JSON array of the best matches (up to 5), most relevant first. Each item must be " +
      '{"id": <profile id>, "reason": <one short sentence on why this person matches>}. ' +
      "Only include people whose profile actually supports the match. If nobody fits, return an empty array [].";
    var userText = "PROFILES:\n" + JSON.stringify(directory) + "\n\nQUESTION: " + query;
    return callClaude(settings, system, userText).then(function (text) {
      var arr = extractJSON(text);
      var results = [];
      for (var i = 0; i < arr.length; i++) {
        var person = window.OrgData.getPersonById(arr[i].id);
        if (person) results.push({ person: person, reason: arr[i].reason, score: 100 - i, matched: [], skeleton: false });
      }
      return { engine: "claude", terms: [], results: results };
    });
  }

  function parseSelfDescriptionReal(text) {
    var settings = window.OrgData.loadSettings();
    var system =
      "Extract a structured staff profile from the person's plain-language self-description. " +
      "Return ONLY JSON of the form " +
      '{"functionalRole": string, "responsibilities": string[], "skills": string[], "projects": string[]}. ' +
      "functionalRole is a concise descriptive title. Keep list items short. Do not invent details that are not implied.";
    return callClaude(settings, system, text).then(function (out) {
      var parsed = extractJSON(out);
      return {
        functionalRole: parsed.functionalRole || "",
        responsibilities: parsed.responsibilities || [],
        skills: parsed.skills || [],
        projects: parsed.projects || [],
        summary: text.trim()
      };
    });
  }

  // ---- Public, promise-based API (engine chosen by settings) -------------
  function search(query) {
    var settings = window.OrgData.loadSettings();
    if (settings.useRealAI && settings.apiKey) {
      return realSearch(query).catch(function (err) {
        // Fall back to simulated so the demo never dead-ends.
        var res = simulatedSearch(query);
        res.fellBack = true;
        res.error = err.message;
        return res;
      });
    }
    return Promise.resolve(simulatedSearch(query));
  }

  function parseSelfDescription(text) {
    var settings = window.OrgData.loadSettings();
    if (settings.useRealAI && settings.apiKey) {
      return parseSelfDescriptionReal(text).catch(function (err) {
        var res = parseSelfDescriptionSimulated(text);
        res.fellBack = true;
        res.error = err.message;
        return res;
      });
    }
    return Promise.resolve(parseSelfDescriptionSimulated(text));
  }

  window.OrgEngine = {
    search: search,
    parseSelfDescription: parseSelfDescription,
    expandQuery: expandQuery,
    // exposed for a quick "test my key" button in Settings
    testKey: function (settings) {
      return callClaude(settings, "Reply with the single word: ok", "ping");
    }
  };
})();
