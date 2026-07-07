/*
 * data.js — Seed data + browser storage layer for OrgSense (POC)
 *
 * Everything lives in the browser's localStorage. No backend, no database.
 * The fictional organization is "Northgate State University" (any resemblance
 * to a real institution is coincidental — all people and details are invented).
 *
 * Records with described:false are "skeletons" — imported from a fake
 * Workday/Teams export with opaque titles but NO functional description.
 * They power the coverage stat AND the live-demo moment: search for what a
 * skeleton person does and the system honestly returns nothing, until someone
 * fills their profile in.
 */
(function () {
  "use strict";

  var PEOPLE_KEY = "orgsense.people.v1";
  var TEAMS_KEY = "orgsense.teams.v1";
  var SETTINGS_KEY = "orgsense.settings.v1";
  var SESSION_KEY = "orgsense.currentUser.v1";

  // Team Topologies team types (https://teamtopologies.com/). Kept here so the
  // engine and UI share one definition. Labels are plain-language; the taxonomy
  // is deliberately easy to swap or relabel for a non-technical audience.
  var TEAM_TYPES = {
    "platform": { label: "Platform", blurb: "Provides self-service capabilities other teams build on." },
    "enabling": { label: "Enabling", blurb: "Helps other teams adopt skills or practices, then steps back." },
    "stream-aligned": { label: "Stream-aligned", blurb: "Owns the end-to-end flow of a service to its users." },
    "complicated-subsystem": { label: "Complicated subsystem", blurb: "Deep specialist expertise most teams shouldn't need to build." }
  };

  // ---- Seed people -------------------------------------------------------
  // Fully described staff (described: true) + skeleton imports (described: false).
  var SEED_PEOPLE = [
    {
      id: "u-marcus-webb",
      name: "Marcus Webb",
      officialTitle: "Executive Director, Information Security",
      functionalRole: "Chief Information Security Officer (CISO)",
      team: "Information Security Office",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 400",
      summary:
        "I lead the university's information security program — strategy, risk, governance, and executive reporting. When something is a security decision at the institutional level, it comes to my office.",
      responsibilities: [
        "Overall information security strategy and roadmap",
        "Security risk management and governance",
        "Incident response oversight and executive escalation",
        "Board and cabinet security reporting",
        "Cyber insurance and regulatory posture"
      ],
      skills: ["Security governance", "Risk management", "GRC", "Leadership", "NIST CSF"],
      projects: ["NIST CSF adoption", "Cyber insurance renewal", "Security awareness rollout"],
      contact: {
        email: "marcus.webb@northgate.edu",
        phone: "(555) 010-4400",
        teams: "@marcus.webb",
        workdayId: "NG-0001"
      },
      described: true,
      updatedAt: "2026-05-02T15:10:00Z"
    },
    {
      id: "u-dana-ortiz",
      name: "Dana Ortiz",
      officialTitle: "IT Professional III",
      functionalRole: "Endpoint Management Lead — College of Engineering",
      team: "Distributed IT — Engineering",
      department: "College of Engineering",
      servesUnit: "College of Engineering",
      location: "Riggs Engineering Hall, Room 210",
      summary:
        "I keep the College of Engineering's Windows computers patched, imaged, and compliant. If a lab or staff machine in Engineering needs updates, provisioning, or endpoint security, that's me.",
      responsibilities: [
        "Windows patching and updates for College of Engineering labs and staff",
        "Microsoft Intune and SCCM administration",
        "OS imaging and zero-touch provisioning",
        "Endpoint security and compliance reporting"
      ],
      skills: ["Microsoft Intune", "SCCM", "Windows 11", "PowerShell", "Autopilot"],
      projects: ["Windows 11 migration", "Lab zero-touch imaging"],
      contact: {
        email: "dana.ortiz@northgate.edu",
        phone: "(555) 010-2210",
        teams: "@dana.ortiz",
        workdayId: "NG-0148"
      },
      described: true,
      updatedAt: "2026-05-18T13:22:00Z"
    },
    {
      id: "u-priya-raman",
      name: "Priya Raman",
      officialTitle: "IT Professional II",
      functionalRole: "Security Awareness & Training Coordinator",
      team: "Information Security Office",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 410",
      summary:
        "I run the security awareness program — phishing simulations, training content, and new-hire security onboarding for the whole university.",
      responsibilities: [
        "Security awareness program and campaigns",
        "Phishing simulations and reporting",
        "Security training content and LMS modules",
        "New-hire security onboarding"
      ],
      skills: ["KnowBe4", "Phishing simulation", "Training design", "Communications"],
      projects: ["Annual security training refresh", "Phish-report button rollout"],
      contact: {
        email: "priya.raman@northgate.edu",
        phone: "(555) 010-4410",
        teams: "@priya.raman",
        workdayId: "NG-0202"
      },
      described: true,
      updatedAt: "2026-05-11T09:40:00Z"
    },
    {
      id: "u-sofia-nguyen",
      name: "Sofia Nguyen",
      officialTitle: "Systems Engineer II",
      functionalRole: "Identity & Access Management (IAM) Engineer",
      team: "Identity Services",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Data Center Annex, Room 105",
      summary:
        "I own single sign-on, multi-factor authentication, and account provisioning. Login problems, SSO integrations, and MFA for students and staff run through my team.",
      responsibilities: [
        "Single sign-on (Okta/SAML) administration",
        "Multi-factor authentication (MFA) rollout and support",
        "Account provisioning and deprovisioning",
        "Periodic access reviews"
      ],
      skills: ["Okta", "SAML", "SCIM", "Active Directory", "MFA"],
      projects: ["MFA for students", "Okta migration", "Automated deprovisioning"],
      contact: {
        email: "sofia.nguyen@northgate.edu",
        phone: "(555) 010-1105",
        teams: "@sofia.nguyen",
        workdayId: "NG-0087"
      },
      described: true,
      updatedAt: "2026-04-29T17:05:00Z"
    },
    {
      id: "u-james-carter",
      name: "James Carter",
      officialTitle: "Network Engineer II",
      functionalRole: "Network Operations Engineer",
      team: "Network & Infrastructure",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Data Center Annex, Room 120",
      summary:
        "I run the campus wired and wireless network — Wi-Fi, VPN, firewalls, DNS. If something can't get on the network or a firewall change is needed, it comes to me.",
      responsibilities: [
        "Campus wired and wireless (Wi-Fi) network",
        "Firewall change management",
        "VPN and remote access",
        "DNS / DHCP"
      ],
      skills: ["Cisco", "Palo Alto", "BGP", "Wi-Fi", "DNS"],
      projects: ["Residence hall Wi-Fi refresh", "Firewall segmentation"],
      contact: {
        email: "james.carter@northgate.edu",
        phone: "(555) 010-1120",
        teams: "@james.carter",
        workdayId: "NG-0061"
      },
      described: true,
      updatedAt: "2026-05-06T11:15:00Z"
    },
    {
      id: "u-aisha-bello",
      name: "Aisha Bello",
      officialTitle: "Compliance Analyst II",
      functionalRole: "Data Privacy Analyst",
      team: "Information Security Office",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 412",
      summary:
        "I handle data privacy and compliance — FERPA and GDPR questions, data subject requests, privacy impact assessments, and records retention.",
      responsibilities: [
        "FERPA and GDPR compliance guidance",
        "Data subject access requests",
        "Privacy impact assessments",
        "Records retention schedules"
      ],
      skills: ["FERPA", "GDPR", "Privacy", "Compliance", "DPIA"],
      projects: ["Student data retention review", "Vendor privacy assessments"],
      contact: {
        email: "aisha.bello@northgate.edu",
        phone: "(555) 010-4412",
        teams: "@aisha.bello",
        workdayId: "NG-0175"
      },
      described: true,
      updatedAt: "2026-05-14T14:50:00Z"
    },
    {
      id: "u-ethan-brooks",
      name: "Ethan Brooks",
      officialTitle: "IT Manager I",
      functionalRole: "IT Service Desk Manager",
      team: "IT Service Desk",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Library Learning Commons, Room 015",
      summary:
        "I run the IT Service Desk — first-line support for students and staff. Password resets, ticket triage in ServiceNow, and general 'my thing is broken' requests start with my team.",
      responsibilities: [
        "Tier 1 support for students and staff",
        "Ticket triage and routing (ServiceNow)",
        "Password reset support",
        "Service desk staffing and metrics"
      ],
      skills: ["ServiceNow", "Customer support", "ITIL", "Team leadership"],
      projects: ["Self-service password reset", "Chat support pilot"],
      contact: {
        email: "ethan.brooks@northgate.edu",
        phone: "(555) 010-0015",
        teams: "@ethan.brooks",
        workdayId: "NG-0033"
      },
      described: true,
      updatedAt: "2026-05-09T08:30:00Z"
    },
    {
      id: "u-grace-liu",
      name: "Grace Liu",
      officialTitle: "Systems Engineer III",
      functionalRole: "Cloud Infrastructure Engineer",
      team: "Cloud Platform",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Data Center Annex, Room 130",
      summary:
        "I manage the university's cloud footprint — AWS accounts, infrastructure-as-code, cloud security posture, and cost. New cloud environments and AWS access come through me.",
      responsibilities: [
        "AWS account and landing-zone management",
        "Cloud security posture management",
        "Infrastructure as code (Terraform)",
        "Cloud cost optimization"
      ],
      skills: ["AWS", "Terraform", "Kubernetes", "Linux", "CloudFormation"],
      projects: ["Landing zone rebuild", "Cost anomaly alerting"],
      contact: {
        email: "grace.liu@northgate.edu",
        phone: "(555) 010-1130",
        teams: "@grace.liu",
        workdayId: "NG-0099"
      },
      described: true,
      updatedAt: "2026-05-03T16:20:00Z"
    },
    {
      id: "u-robert-kim",
      name: "Robert Kim",
      officialTitle: "Security Analyst II",
      functionalRole: "Security Operations (SOC) Analyst",
      team: "Information Security Office",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 414",
      summary:
        "I'm on the security operations team — monitoring, alert triage, incident response, and threat hunting. If something looks like an active security incident, escalate to me.",
      responsibilities: [
        "Security monitoring (SIEM)",
        "Alert triage and investigation",
        "Incident response",
        "Threat hunting"
      ],
      skills: ["Splunk", "SIEM", "Incident response", "EDR", "Threat hunting"],
      projects: ["SIEM tuning", "Ransomware tabletop exercises"],
      contact: {
        email: "robert.kim@northgate.edu",
        phone: "(555) 010-4414",
        teams: "@robert.kim",
        workdayId: "NG-0141"
      },
      described: true,
      updatedAt: "2026-05-16T10:05:00Z"
    },
    {
      id: "u-maria-gonzalez",
      name: "Maria Gonzalez",
      officialTitle: "Business Systems Analyst II",
      functionalRole: "HR Systems (Workday) Analyst",
      team: "Human Resources Technology",
      department: "Human Resources",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 300",
      summary:
        "I administer Workday for HR — position and org data, reporting, and onboarding workflows. Questions about the org chart, job data, or Workday HR reports come to me.",
      responsibilities: [
        "Workday HCM administration",
        "Org chart and position data",
        "HR reporting and dashboards",
        "Onboarding workflow configuration"
      ],
      skills: ["Workday", "HRIS", "Reporting", "Business process config"],
      projects: ["Org chart data cleanup", "Onboarding workflow redesign"],
      contact: {
        email: "maria.gonzalez@northgate.edu",
        phone: "(555) 010-3300",
        teams: "@maria.gonzalez",
        workdayId: "NG-0055"
      },
      described: true,
      updatedAt: "2026-05-07T12:45:00Z"
    },
    {
      id: "u-david-park",
      name: "David Park",
      officialTitle: "Applications Developer II",
      functionalRole: "Web Applications Developer",
      team: "Enterprise Applications",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Riggs Engineering Hall, Room 118",
      summary:
        "I build and maintain university web applications and the portal, including SSO integrations and accessibility. Front-end web work and portal changes come to me.",
      responsibilities: [
        "University web portal development",
        "Single sign-on integrations for web apps",
        "Web accessibility (WCAG) remediation",
        "Front-end development"
      ],
      skills: ["JavaScript", "React", "Accessibility", "REST APIs", "TypeScript"],
      projects: ["Portal redesign", "Accessibility audit remediation"],
      contact: {
        email: "david.park@northgate.edu",
        phone: "(555) 010-2118",
        teams: "@david.park",
        workdayId: "NG-0113"
      },
      described: true,
      updatedAt: "2026-05-12T15:35:00Z"
    },
    {
      id: "u-lena-fischer",
      name: "Lena Fischer",
      officialTitle: "Research Computing Specialist II",
      functionalRole: "Research Computing Specialist",
      team: "Research Technology",
      department: "Office of Research",
      servesUnit: "College of Engineering & College of Sciences",
      location: "Sciences Complex, Room 040",
      summary:
        "I support research computing — the HPC cluster, research data storage, and Linux support for labs. Faculty running grant computing or needing the cluster work with me.",
      responsibilities: [
        "High-performance computing (HPC) cluster support",
        "Research data storage",
        "Grant computing consultations",
        "Linux support for research labs"
      ],
      skills: ["HPC", "Slurm", "Linux", "Research data management"],
      projects: ["GPU cluster expansion", "Research storage tiering"],
      contact: {
        email: "lena.fischer@northgate.edu",
        phone: "(555) 010-0040",
        teams: "@lena.fischer",
        workdayId: "NG-0126"
      },
      described: true,
      updatedAt: "2026-04-27T13:00:00Z"
    },
    {
      id: "u-tom-reyes",
      name: "Tom Reyes",
      officialTitle: "AV Technology Specialist II",
      functionalRole: "Classroom & AV Technology Lead",
      team: "Learning Spaces",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Library Learning Commons, Room 022",
      summary:
        "I look after classroom and event AV — projectors, Zoom Rooms, lecture capture, and event support. If a classroom's tech isn't working or an event needs AV, that's my team.",
      responsibilities: [
        "Classroom AV systems",
        "Zoom Rooms and hybrid classrooms",
        "Lecture capture",
        "Event AV support"
      ],
      skills: ["AV systems", "Zoom Rooms", "Crestron", "Lecture capture"],
      projects: ["Hybrid classroom upgrades", "Lecture capture standardization"],
      contact: {
        email: "tom.reyes@northgate.edu",
        phone: "(555) 010-0022",
        teams: "@tom.reyes",
        workdayId: "NG-0158"
      },
      described: true,
      updatedAt: "2026-05-05T09:10:00Z"
    },
    {
      id: "u-nadia-hassan",
      name: "Nadia Hassan",
      officialTitle: "Procurement Analyst II",
      functionalRole: "IT Procurement & Software Licensing Analyst",
      team: "IT Business Office",
      department: "Office of Information Technology",
      servesUnit: "University-wide",
      location: "Ellsworth Admin Building, Room 220",
      summary:
        "I handle IT procurement and software licensing — vendor contracts, renewals, purchase approvals, and our SaaS inventory. New software purchases and license questions come to me.",
      responsibilities: [
        "Software license management",
        "IT vendor contracts and renewals",
        "Purchase approvals",
        "SaaS inventory and true-ups"
      ],
      skills: ["Software licensing", "Procurement", "Vendor management", "Contracts"],
      projects: ["SaaS inventory consolidation", "Adobe license true-up"],
      contact: {
        email: "nadia.hassan@northgate.edu",
        phone: "(555) 010-2220",
        teams: "@nadia.hassan",
        workdayId: "NG-0072"
      },
      described: true,
      updatedAt: "2026-05-13T14:20:00Z"
    },
    // ---- Skeleton imports (described: false) -----------------------------
    {
      id: "u-kevin-zhao",
      name: "Kevin Zhao",
      officialTitle: "IT Professional I",
      functionalRole: "",
      team: "",
      department: "Office of Information Technology",
      servesUnit: "",
      location: "Ellsworth Admin Building",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "kevin.zhao@northgate.edu",
        phone: "(555) 010-2000",
        teams: "@kevin.zhao",
        workdayId: "NG-0210"
      },
      described: false,
      updatedAt: null
    },
    {
      id: "u-olivia-bennett",
      name: "Olivia Bennett",
      officialTitle: "Administrative Associate II",
      functionalRole: "",
      team: "",
      department: "Office of Information Technology",
      servesUnit: "",
      location: "Ellsworth Admin Building",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "olivia.bennett@northgate.edu",
        phone: "(555) 010-2001",
        teams: "@olivia.bennett",
        workdayId: "NG-0211"
      },
      described: false,
      updatedAt: null
    },
    {
      id: "u-samuel-turner",
      name: "Samuel Turner",
      officialTitle: "IT Professional II",
      functionalRole: "",
      team: "",
      department: "College of Engineering",
      servesUnit: "College of Engineering",
      location: "Riggs Engineering Hall",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "samuel.turner@northgate.edu",
        phone: "(555) 010-2222",
        teams: "@samuel.turner",
        workdayId: "NG-0212"
      },
      described: false,
      updatedAt: null
    },
    {
      id: "u-hannah-mills",
      name: "Hannah Mills",
      officialTitle: "Systems Analyst I",
      functionalRole: "",
      team: "",
      department: "Human Resources",
      servesUnit: "",
      location: "Ellsworth Admin Building",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "hannah.mills@northgate.edu",
        phone: "(555) 010-3001",
        teams: "@hannah.mills",
        workdayId: "NG-0213"
      },
      described: false,
      updatedAt: null
    },
    {
      id: "u-raj-patel",
      name: "Raj Patel",
      officialTitle: "IT Professional III",
      functionalRole: "",
      team: "",
      department: "Office of Information Technology",
      servesUnit: "",
      location: "Ellsworth Admin Building",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "raj.patel@northgate.edu",
        phone: "(555) 010-2003",
        teams: "@raj.patel",
        workdayId: "NG-0214"
      },
      described: false,
      updatedAt: null
    },
    {
      id: "u-emily-clark",
      name: "Emily Clark",
      officialTitle: "Communications Specialist II",
      functionalRole: "",
      team: "",
      department: "Office of Information Technology",
      servesUnit: "",
      location: "Ellsworth Admin Building",
      summary: "",
      responsibilities: [],
      skills: [],
      projects: [],
      contact: {
        email: "emily.clark@northgate.edu",
        phone: "(555) 010-2004",
        teams: "@emily.clark",
        workdayId: "NG-0215"
      },
      described: false,
      updatedAt: null
    }
  ];

  // ---- Seed teams (Team API / Team Topologies) ---------------------------
  // Each team publishes a lightweight "Team API": what it is, what it provides,
  // and how to engage it. `provides[].how` is the interaction mode:
  // self-service (X-as-a-service), request (queue), or collaborate.
  // `memberIds` link to SEED_PEOPLE. One team is left undescribed to power the
  // team-coverage stat and the "no Team API yet" empty state.
  var SEED_TEAMS = [
    {
      id: "team-infosec",
      name: "Information Security Office",
      type: "enabling",
      department: "Office of Information Technology",
      mission: "We help every team across the university reduce security risk — through guidance, review, monitoring, and response — without owning their systems.",
      provides: [
        { what: "Security reviews & risk assessments", how: "request", detail: "Submit via the Security Review queue in ServiceNow." },
        { what: "Incident response", how: "request", detail: "Escalate suspected incidents 24/7 to the SOC hotline." },
        { what: "Security awareness & phishing training", how: "self-service", detail: "Enroll in the LMS; simulated campaigns run automatically." },
        { what: "Privacy / FERPA & GDPR guidance", how: "collaborate", detail: "Book a consult with the data privacy analyst." }
      ],
      engage: {
        channel: "Teams: #info-security",
        queue: "ServiceNow → Security",
        hours: "Mon–Fri 8–5; SOC on-call 24/7",
        sla: "Incidents: 1 hr · Reviews: 5 business days"
      },
      memberIds: ["u-marcus-webb", "u-priya-raman", "u-aisha-bello", "u-robert-kim"],
      described: true
    },
    {
      id: "team-identity",
      name: "Identity Services",
      type: "platform",
      department: "Office of Information Technology",
      mission: "We provide self-service identity and access — login, MFA, and account lifecycle — so teams don't have to build their own.",
      provides: [
        { what: "Single sign-on (SSO) app integration", how: "request", detail: "Request app onboarding via the Identity queue." },
        { what: "Multi-factor authentication (MFA)", how: "self-service", detail: "Users self-enroll at mfa.northgate.edu." },
        { what: "Account provisioning / deprovisioning", how: "self-service", detail: "Automated from Workday; exceptions via ticket." }
      ],
      engage: {
        channel: "Teams: #identity",
        queue: "ServiceNow → Identity",
        hours: "Mon–Fri 8–5",
        sla: "App onboarding: 10 business days"
      },
      memberIds: ["u-sofia-nguyen"],
      described: true
    },
    {
      id: "team-network",
      name: "Network & Infrastructure",
      type: "platform",
      department: "Office of Information Technology",
      mission: "We run the campus network as a reliable platform — wired, wireless, VPN, and firewall — so everything else can just connect.",
      provides: [
        { what: "Campus Wi-Fi & wired network", how: "self-service", detail: "Connect to 'Northgate-Secure'; issues via ticket." },
        { what: "VPN / remote access", how: "self-service", detail: "Download the VPN client from the software portal." },
        { what: "Firewall changes", how: "request", detail: "Submit a firewall change request (CAB-reviewed)." }
      ],
      engage: {
        channel: "Teams: #network",
        queue: "ServiceNow → Network",
        hours: "Mon–Fri 7–6; on-call for outages",
        sla: "Firewall changes: weekly CAB"
      },
      memberIds: ["u-james-carter"],
      described: true
    },
    {
      id: "team-cloud",
      name: "Cloud Platform",
      type: "platform",
      department: "Office of Information Technology",
      mission: "We provide governed AWS landing zones and infrastructure-as-code so teams can ship to the cloud safely and quickly.",
      provides: [
        { what: "AWS account / landing zone", how: "request", detail: "Request a new account via the Cloud intake form." },
        { what: "Infrastructure-as-code modules", how: "self-service", detail: "Reusable Terraform modules in the internal registry." },
        { what: "Cloud cost & security review", how: "collaborate", detail: "Quarterly reviews; ad-hoc on request." }
      ],
      engage: {
        channel: "Teams: #cloud-platform",
        queue: "ServiceNow → Cloud",
        hours: "Mon–Fri 8–5",
        sla: "New account: 3 business days"
      },
      memberIds: ["u-grace-liu"],
      described: true
    },
    {
      id: "team-coe-it",
      name: "Distributed IT — Engineering",
      type: "stream-aligned",
      department: "College of Engineering",
      mission: "We are the College of Engineering's embedded IT — we keep Engineering's labs, staff devices, and classroom tech running end to end.",
      provides: [
        { what: "Endpoint management & Windows updates (Engineering)", how: "self-service", detail: "Managed automatically via Intune; issues via ticket." },
        { what: "Lab imaging & provisioning", how: "request", detail: "Request lab builds before each term." }
      ],
      engage: {
        channel: "Teams: #coe-it",
        queue: "ServiceNow → COE IT",
        hours: "Mon–Fri 8–5",
        sla: "Device issues: 1 business day"
      },
      memberIds: ["u-dana-ortiz"],
      described: true
    },
    {
      id: "team-servicedesk",
      name: "IT Service Desk",
      type: "stream-aligned",
      department: "Office of Information Technology",
      mission: "We're the front door to IT — first-line support for every student and staff member, resolving or routing every request.",
      provides: [
        { what: "Password resets & account help", how: "self-service", detail: "Reset at password.northgate.edu, or call the desk." },
        { what: "Tier-1 support & ticket triage", how: "request", detail: "Open a ticket in ServiceNow or chat with us." }
      ],
      engage: {
        channel: "Teams: #help-desk",
        queue: "ServiceNow → Service Desk",
        hours: "Mon–Fri 7–7; Sat 9–1",
        sla: "First response: 1 hour"
      },
      memberIds: ["u-ethan-brooks"],
      described: true
    },
    {
      id: "team-enterprise-apps",
      name: "Enterprise Applications",
      type: "platform",
      department: "Office of Information Technology",
      mission: "We build and run shared web applications and the university portal so teams don't each reinvent the front door.",
      provides: [
        { what: "University portal & web apps", how: "self-service", detail: "Access at my.northgate.edu." },
        { what: "SSO / API integration for web apps", how: "collaborate", detail: "Partner with us to integrate your application." },
        { what: "Accessibility (WCAG) remediation", how: "request", detail: "Request an accessibility review." }
      ],
      engage: {
        channel: "Teams: #enterprise-apps",
        queue: "ServiceNow → Enterprise Apps",
        hours: "Mon–Fri 8–5",
        sla: "Integration intake: 2 weeks"
      },
      memberIds: ["u-david-park"],
      described: true
    },
    {
      id: "team-research-tech",
      name: "Research Technology",
      type: "complicated-subsystem",
      department: "Office of Research",
      mission: "We are the specialists for research computing — HPC, research data, and lab Linux — deep expertise most teams shouldn't need to build.",
      provides: [
        { what: "HPC cluster access", how: "request", detail: "Request an allocation; grant-backed priority available." },
        { what: "Research data storage", how: "request", detail: "Request tiered storage for your project." },
        { what: "Lab Linux & grant computing consults", how: "collaborate", detail: "Book a consult for grant computing needs." }
      ],
      engage: {
        channel: "Teams: #research-computing",
        queue: "ServiceNow → Research Tech",
        hours: "Mon–Fri 9–5",
        sla: "Allocation: 5 business days"
      },
      memberIds: ["u-lena-fischer"],
      described: true
    },
    {
      id: "team-learning-spaces",
      name: "Learning Spaces",
      type: "stream-aligned",
      department: "Office of Information Technology",
      mission: "We keep classrooms and event spaces teaching-ready — AV, hybrid rooms, and lecture capture — aligned to the academic calendar.",
      provides: [
        { what: "Classroom AV support", how: "request", detail: "Report a classroom issue for same-day response." },
        { what: "Event AV setup", how: "request", detail: "Book event support two weeks ahead." },
        { what: "Lecture capture", how: "self-service", detail: "Enabled in capture-equipped rooms." }
      ],
      engage: {
        channel: "Teams: #av-support",
        queue: "ServiceNow → Learning Spaces",
        hours: "Mon–Fri 7–6 during term",
        sla: "Classroom issues: same day"
      },
      memberIds: ["u-tom-reyes"],
      described: true
    },
    {
      id: "team-hr-tech",
      name: "Human Resources Technology",
      type: "platform",
      department: "Human Resources",
      mission: "We run Workday for the university — position data, reporting, and onboarding — as a platform HR and managers self-serve from.",
      provides: [
        { what: "Workday reporting", how: "self-service", detail: "Standard reports in Workday; custom via request." },
        { what: "Org & position data corrections", how: "request", detail: "Request corrections to position/org data." },
        { what: "Onboarding workflows", how: "self-service", detail: "Automated on hire; exceptions via ticket." }
      ],
      engage: {
        channel: "Teams: #hr-tech",
        queue: "ServiceNow → HR Tech",
        hours: "Mon–Fri 8–5",
        sla: "Data corrections: 3 business days"
      },
      memberIds: ["u-maria-gonzalez"],
      described: true
    },
    {
      // Undescribed on purpose: the team exists (imported from the org chart)
      // but no one has published its Team API yet.
      id: "team-it-business-office",
      name: "IT Business Office",
      type: "enabling",
      department: "Office of Information Technology",
      mission: "",
      provides: [],
      engage: {},
      memberIds: ["u-nadia-hassan"],
      described: false
    }
  ];

  var DEFAULT_SETTINGS = {
    useRealAI: false,
    apiKey: "",
    model: "claude-opus-4-8"
  };

  // ---- Storage helpers ---------------------------------------------------
  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadPeople() {
    try {
      var raw = localStorage.getItem(PEOPLE_KEY);
      if (!raw) {
        var seeded = deepCopy(SEED_PEOPLE);
        localStorage.setItem(PEOPLE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw);
    } catch (e) {
      // Corrupt or unavailable storage — fall back to in-memory seed.
      return deepCopy(SEED_PEOPLE);
    }
  }

  function savePeople(people) {
    try {
      localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
    } catch (e) {
      /* storage may be full or disabled; POC tolerates this */
    }
  }

  function getPeople() {
    return loadPeople();
  }

  function getPersonById(id) {
    var people = loadPeople();
    for (var i = 0; i < people.length; i++) {
      if (people[i].id === id) return people[i];
    }
    return null;
  }

  function upsertPerson(person) {
    var people = loadPeople();
    var found = false;
    for (var i = 0; i < people.length; i++) {
      if (people[i].id === person.id) {
        people[i] = person;
        found = true;
        break;
      }
    }
    if (!found) people.push(person);
    savePeople(people);
    return person;
  }

  function resetToSeed() {
    var seededPeople = deepCopy(SEED_PEOPLE);
    var seededTeams = deepCopy(SEED_TEAMS);
    savePeople(seededPeople);
    saveTeams(seededTeams);
    return seededPeople;
  }

  function coverage() {
    var people = loadPeople();
    var described = 0;
    for (var i = 0; i < people.length; i++) {
      if (people[i].described) described++;
    }
    return {
      described: described,
      total: people.length,
      percent: people.length ? Math.round((described / people.length) * 100) : 0
    };
  }

  // ---- Teams -------------------------------------------------------------
  function loadTeams() {
    try {
      var raw = localStorage.getItem(TEAMS_KEY);
      if (!raw) {
        var seeded = deepCopy(SEED_TEAMS);
        localStorage.setItem(TEAMS_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw);
    } catch (e) {
      return deepCopy(SEED_TEAMS);
    }
  }

  function saveTeams(teams) {
    try {
      localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
    } catch (e) {
      /* ignore */
    }
  }

  function getTeams() {
    return loadTeams();
  }

  function getTeamById(id) {
    var teams = loadTeams();
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].id === id) return teams[i];
    }
    return null;
  }

  function teamCoverage() {
    var teams = loadTeams();
    var described = 0;
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].described) described++;
    }
    return {
      described: described,
      total: teams.length,
      percent: teams.length ? Math.round((described / teams.length) * 100) : 0
    };
  }

  // ---- Settings ----------------------------------------------------------
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return deepCopy(DEFAULT_SETTINGS);
      var parsed = JSON.parse(raw);
      // Merge with defaults so new fields don't break old saved settings.
      var merged = deepCopy(DEFAULT_SETTINGS);
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) merged[k] = parsed[k];
      }
      return merged;
    } catch (e) {
      return deepCopy(DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      /* ignore */
    }
  }

  // ---- Current user (who is "logged in" for this demo) -------------------
  function getCurrentUserId() {
    try {
      return localStorage.getItem(SESSION_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setCurrentUserId(id) {
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  // ---- Import / Export ---------------------------------------------------
  function exportJSON() {
    return JSON.stringify({
      people: loadPeople(),
      teams: loadTeams(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    var people = Array.isArray(parsed) ? parsed : parsed.people;
    if (!Array.isArray(people)) throw new Error("File does not contain a people array.");
    savePeople(people);
    // Teams are optional for backward compatibility with older exports.
    if (parsed && Array.isArray(parsed.teams)) saveTeams(parsed.teams);
    return people;
  }

  // ---- Public API --------------------------------------------------------
  window.OrgData = {
    SEED_PEOPLE: SEED_PEOPLE,
    SEED_TEAMS: SEED_TEAMS,
    TEAM_TYPES: TEAM_TYPES,
    getPeople: getPeople,
    getPersonById: getPersonById,
    upsertPerson: upsertPerson,
    getTeams: getTeams,
    getTeamById: getTeamById,
    teamCoverage: teamCoverage,
    resetToSeed: resetToSeed,
    coverage: coverage,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    getCurrentUserId: getCurrentUserId,
    setCurrentUserId: setCurrentUserId,
    exportJSON: exportJSON,
    importJSON: importJSON,
    newId: function (name) {
      var base = "u-" + String(name || "person").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return base + "-" + Math.random().toString(36).slice(2, 7);
    }
  };
})();
