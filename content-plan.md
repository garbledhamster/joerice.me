# joerice.me — Content Plan

Everything the site needs filled in, section by section. Each block shows the current state and what needs to be written or swapped out.

---

## How the Site Works

The site is a terminal-style portfolio. Visitors type commands (`open About`, `open Projects`, etc.) to navigate. All content lives inside the `fs` object in `index.html`. To add or edit content, find the matching path key and update the `body`, `items`, `guide`, or `url` field. The site has no build step — just edit and save.

Suggested visitor trail (shown on the home screen):
```
About → Projects → Skills → Posts → Contact
```

---

## Sections

### `/` — Home

| Field | Current | Status |
|-------|---------|--------|
| `guide` | "This is the starting point. Read it like a small trail: identity, work, ability, interests, proof, contact." | ✅ Fine as-is or personalise |
| Version string | `version 0.7.2 plaintext trail` | 🔲 Update when you bump content |

---

### `/About`

**Current text:**
```
Joe Rice

Systems administrator. Builder. Father. Learner.

This site is a terminal-style portfolio. It is meant to feel like opening a small
machine instead of scrolling a normal page.

The clean path is:
About -> Projects -> Skills -> Posts -> Contact
```

**What to write:**
- 1–3 sentence personal tagline — who you are right now, in your own voice
- What you do day-to-day (job title / role)
- One sentence on why you built this site or what you want it to say about you
- Optionally: where you are based, a fact or two that makes you human

**Example shape (replace with real words):**
```
Joe Rice

[Your actual tagline or pitch — make it sound like you, not a resume.]

Based in [location]. Working in [company/field].
[One personal note — fatherhood, something you're building, something you're thinking about.]
```

---

### `/Projects`

#### `/Projects/fortigate-blocklist`

**Current text:**
```
Security automation concept for blocking malicious traffic through structured feeds.
```

**What to write:**
- What the project actually does (or will do)
- Problem it solves
- Tech used (FortiGate, PowerShell, feed format, etc.)
- Status: concept / in progress / done
- Optional: link to repo or demo

---

#### `/Projects/it-dashboard`

**Current text:**
```
Internal single-pane dashboard concept for tickets, SLA, security, network, and systems status.
```

**What to write:**
- What data sources it pulls from
- What problem it was solving at work
- Stack (ASPX, SQL, PowerShell, etc.)
- Status: concept / built internally / in progress
- Optional: screenshot link (add to `/Media`)

---

#### `/Projects/site-shell`

**Current text:**
```
A plaintext terminal interface for navigating identity, work, learning, services, media, and life phases.
```

**What to write:**
- Why you built it this way (the terminal concept)
- What it's built on (vanilla HTML/CSS/JS, no framework)
- Link to the GitHub repo (if public)
- Anything interesting you learned building it

**New projects to add:**
Think about any other real things you've built, automated, or shipped — even small ones. Each one gets a child path like `/Projects/project-name`. Add them to the `children` array in `/Projects` and create a matching `fs` entry.

---

### `/Skills`

**Current list:**
```
PowerShell, Azure, Cloud, Networking, Security, SQL, Automation, Dashboards, ASPX, Documentation
```

**What to review:**
- Is every item accurate and current?
- Anything missing you actually use regularly (e.g. Intune, Active Directory, Entra ID, KQL, Git, Terraform, etc.)?
- Remove anything that feels like filler or padding
- Order roughly by strength or relevance if that matters to you

---

### `/Posts`

Posts are short entries — thoughts, notes, working ideas.

#### `/Posts/productive-procrastination.txt` ✅ Written

#### `/Posts/terminal-website-concept.txt` ✅ Written

**Posts to write next:**
Add new entries to the `children` array in `/Posts` and create matching `fs` entries. Ideas based on what's in the rest of the site:

| Suggested post | Prompt |
|----------------|--------|
| `phases-of-learning.txt` | What does it feel like to move from chaos to system? |
| `somatics-and-work.txt` | How does body awareness connect to how you think or work? |
| `ai-as-tool-not-author.txt` | What's your actual relationship with AI in your work? |
| `machiavelli-and-it.txt` | What does Machiavelli actually say that applies to how organisations work? |
| `what-documentation-really-is.txt` | Why does good docs matter and what makes most docs bad? |
| `what-i-am-building-right-now.txt` | A post about the current project or phase |

Write as plaintext. Keep them short — a few sentences to a few paragraphs.

---

### `/Phases`

Life/work chapters. These are deliberately vague at the moment.

#### `/Phases/Phase-01`

**Current text:**
```
Early formation. Curiosity. Raw ambition. Unstructured learning.
```

**What to write:**
- Rough time period (no need for exact dates)
- What you were doing, where you were, how you were thinking
- What defined that chapter — even just 2–3 sentences

---

#### `/Phases/Phase-02`

**Current text:**
```
System building. Technical growth. Pattern recognition.
```

**What to write:**
- What changed from Phase 01
- The kinds of work or projects from this period
- What you learned or built during this time

---

#### `/Phases/Phase-03` — Current

**Current text:**
```
Current phase:
more confident, more steady, less dependent on AI to form the words.

Operating problem:
translate learning into real visible work.
```

**Status:** Has real content. ✅ Update this whenever your current frame shifts.

---

### `/Interests`

**Current list:**
```
Great Conversation, Machiavelli, Learning, Visual Thinking, AI, Somatics, Parenting, Neuroscience
```

**What to review:**
- These look accurate — keep anything real
- Could add 1–2 more if there's something consistently on your mind
- Could remove anything that no longer applies

---

### `/Services`

**Current list:**
```
IT automation, PowerShell scripting, internal dashboards, security log analysis, network documentation
```

**What to write / review:**
- Do you actually want to offer these as services to clients/employers?
- If yes: sharpen the language to sound like outcomes, not just skills
- Add a `/Contact` call-to-action note so people know how to reach you after reading this
- Consider whether pricing, availability, or engagement style belongs here

**Example sharper framing:**
```
PowerShell automation for IT operations
Internal dashboards connecting tickets, SLA, and security data
Security log analysis and incident documentation
Network documentation and runbook writing
```

---

### `/Media`

All three images are placeholders using `picsum.photos`. Replace with real image URLs when you have them.

| Path | Placeholder URL | What to replace with |
|------|----------------|----------------------|
| `/Media/desk-setup.jpg` | `https://picsum.photos/id/26/1200/800` | Photo of your actual workspace |
| `/Media/network-diagram.jpg` | `https://picsum.photos/id/180/1200/800` | Screenshot or diagram from a real project |
| `/Media/field-notes.jpg` | `https://picsum.photos/id/1060/1200/800` | Any image — notes, whiteboard, something personal |

Also update the `body` text for each image (currently says "Image placeholder for…") to describe what the image actually is.

**To add more images:** add a new child entry to `/Media`, a matching `/Gallery` item, and a new `fs` entry with type `"image"`, a real `url`, and a real `body`.

---

### `/Gallery`

Gallery mirrors the `/Media` children as a list view. When you update `/Media`, update `/Gallery` items to match.

---

### `/Contact`

**Current text:**
```
Contact placeholder.

Later: email, LinkedIn, GitHub, inquiry form.
```

**What to write:**
- Your preferred contact method (email address or a mailto link)
- LinkedIn URL
- GitHub profile URL
- Optional: a brief note on what kind of contact you're open to ("open to new roles", "open to freelance", "just say hello", etc.)

**Example:**
```
Reach me directly:

email:    joe@[yourdomain].com
linkedin: linkedin.com/in/[yourhandle]
github:   github.com/[garbledhamster]

[One sentence on what kind of messages you welcome.]
```

---

## Summary Checklist

- [ ] `/About` — write a real bio in your own voice
- [ ] `/Projects/fortigate-blocklist` — flesh out the real description and status
- [ ] `/Projects/it-dashboard` — flesh out the real description and status
- [ ] `/Projects/site-shell` — add the GitHub link and the why-behind-it
- [ ] `/Projects` — add any other real projects you want to show
- [ ] `/Skills` — audit the list; add what's missing, remove filler
- [ ] `/Posts` — write 2–3 more posts on the topics above
- [ ] `/Phases/Phase-01` — write 2–3 sentences about that chapter
- [ ] `/Phases/Phase-02` — write 2–3 sentences about that chapter
- [ ] `/Media` — replace placeholder image URLs with real ones and update body text
- [ ] `/Services` — sharpen the language if you're using this for actual outreach
- [ ] `/Contact` — add real contact details
