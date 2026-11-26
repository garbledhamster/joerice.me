export const startingCatalog = [
	{
		id: "about",
		name: "About",
		intro:
			"I build software, work on the systems people rely on, and teach the AI process I use in my own work. Pick a note to see what I’ve done and how I can help.",
		notes: [],
	},
	{
		id: "build",
		name: "Build",
		about:
			"I’m a builder. I take ideas through design, development, and handoff. I made Builder to put that process into a workspace. This portfolio is one idea I designed and used AI to turn into a working site.",
		intro:
			"I build websites and apps, connect tools, and make repeated work easier.",
		handoff: {
			title: "When it’s ready to hand over",
			text: "You get the live site or app, the setup we agreed on, and instructions for updating it. We check what someone came there to do.",
		},
		notes: [
			{
				id: "builder",
				title: "Take an idea into a working build",
				included: [
					"Agree on what someone needs to be able to do with the finished system.",
					"Work through the design, project plan, build, and checks.",
					"Hand over the working result and show you how to keep using it.",
				],
				example: {
					title: "Builder",
					text: "I made Builder to put my project process in one place. Open the public guide to see how a project goes from its first decisions to a build you can check and share.",
					kind: "Public guide",
					href: "https://bible.ourstuff.space/guide.html",
				},
			},
			{
				id: "book",
				serviceId: "web-site",
				title: "A website for your book",
				included: [
					"A page to introduce your book",
					"A sample readers can try",
					"Clear links to get the book",
				],
				example: {
					title: "Feelings & Needs",
					text: "I made the site for my manual. Open the sample to read a few pages, then find the options for paperback or PDF.",
					kind: "Live example",
					href: "https://feelings.ourstuff.space/",
				},
			},
			{
				id: "channel",
				serviceId: "web-site",
				title: "A home for your channel",
				included: [
					"A place to watch or listen to your latest work",
					"An archive people can browse from their phones",
					"Links to follow you where you publish",
				],
				example: {
					title: "Fishing with Big Pig",
					text: "Bryan makes the fishing videos. I worked on the site that gives those videos a home. Try finding the latest video, then look for an older one.",
					kind: "Live example",
					href: "https://fwbp.net/",
				},
			},
			{
				id: "local",
				serviceId: "web-site",
				title: "A site for your local business",
				included: [
					"The information customers need before they visit or call",
					"A clear way to get directions, get in touch or place an order",
					"Instructions for updating details when they change",
				],
				example: {
					title: "J & D’s Heritage Hog Farm",
					text: "I built this site for my parents’ farm. Start with the buying information, then find where to ask about availability and pickup.",
					kind: "Published portfolio project",
					href: "https://jdhogfarm.com/",
				},
			},
			{
				id: "app",
				serviceId: "web-app",
				title: "An app for a useful idea",
				included: [
					"One clear task people can do with the app",
					"The screens and saved information that task needs",
					"A check of the everyday flow and a handoff you can use",
				],
				example: {
					title: "Fast Track",
					text: "Fast Track is one of my web apps. It asks you to sign in before you can try the timer or open the history view.",
					kind: "Sign-in required",
					href: "https://fasttrack.ourstuff.space/",
				},
			},
			{
				id: "product",
				serviceId: "web-site",
				title: "A site that explains what you offer",
				included: [
					"A clear description of what someone can get from you",
					"Examples or answers that help people decide if it fits",
					"A way to buy, book or ask a question",
				],
				example: {
					title: "Privian Care Management",
					text: "I built this site to explain the care services and give families a way to get in touch. Read a service description and find the contact options.",
					kind: "Published portfolio project",
					href: "https://priviancare.com/",
				},
			},
			{
				id: "portfolio",
				serviceId: "web-site",
				title: "A portfolio that shows what you did",
				included: [
					"Selected work with your role and what came out of it",
					"Links so visitors can try the work or read more",
					"A way to reach you when a project catches their attention",
				],
				example: {
					title: "Joe Rice’s portfolio",
					text: "I use my own site to connect services to projects people can explore. Pick a project and see what I built and what you can try.",
					kind: "Live example",
					href: "https://joerice.me/",
				},
			},
			{
				id: "fan",
				serviceId: "web-site",
				title: "A site for your fan community",
				included: [
					"A home for the parts of the subject fans want to explore",
					"A clear path for a new visitor to get started",
					"Artwork, clips and other material you have permission to use",
				],
				example: {
					title: "A guide for new fans",
					text: "Picture a fan group that keeps answering where to start. A short starter guide could put the first three things to try in one place. I’m still confirming which fan site I can share here.",
					kind: "Illustrative example",
				},
			},
		],
	},
	{
		id: "security",
		name: "Security",
		about:
			"I’ve traced server intrusions through logs and traffic in Wireshark. I run vulnerability scans and security audits, and I’ll explain what I find and which fixes I’d start with.",
		intro:
			"I can scan for vulnerabilities, audit the systems you rely on, and inspect logs and traffic to investigate suspicious activity.",
		notes: [
			{
				id: "review",
				title: "Find the first security fixes to make",
				included: [
					"Agree on the accounts and devices you want checked.",
					"Scope a vulnerability scan and review findings, logs, or traffic where relevant.",
					"Review sign-in protections, who has access and whether you can recover important files.",
					"Leave with a list of fixes in order and a way to check each one.",
				],
				example: {
					title: "Restore a file from backup",
					text: "Try a restore plan on two sample copies of the same inventory. Recover one missing row while preserving a newer count.",
					kind: "Worked example",
					href: "/examples/backup-restore/",
				},
			},
		],
	},
	{
		id: "systems",
		name: "IT & Systems",
		about:
			"I traced outages at several sites to equipment handing out the wrong network settings. I’ve built and managed over 60 small and midsize business networks, and I can audit your network and servers.",
		intro:
			"I’ve spent more than 15 years in IT, from end-user support to servers, networking and virtualization. I can audit the systems you already have and recommend what to improve.",
		notes: [
			{
				id: "infrastructure-audit",
				serviceId: "it-services",
				title: "Audit the network and servers you have",
				included: [
					"Review the equipment, servers, and connections your work depends on.",
					"Look for recurring problems, aging equipment, and gaps in the setup.",
					"Recommend what to fix first and what equipment you can keep using.",
				],
				example: {
					title: "Helping People Get Back to Work",
					text: "Read how I approach IT work across the user’s device, servers, and network, including how I narrow down a fault and communicate the next check.",
					kind: "Portfolio article",
					href: "https://joerice.me/#work/0008",
				},
			},
			{
				id: "troubleshoot",
				serviceId: "it-services",
				title: "Get a device or tool working again",
				included: [
					"Find out what you were trying to do and who else is affected.",
					"Check devices, network connections and the tools involved to narrow down the cause.",
					"Try the task again with you and leave notes for next time.",
				],
				example: {
					title: "One laptop can’t use the office printer",
					text: "In this practice case, other devices can print. I’d check which printer the laptop has selected, then print a test page and a regular document with the person who reported the problem.",
					kind: "Simulated case",
					href: "/examples/worked-cases/#printer",
				},
			},
			{
				id: "knowledge",
				serviceId: "knowledge-mgmt",
				title: "Make the information you keep easier to find",
				included: [
					"Organize notes around the questions people need answered.",
					"Keep source links and decisions close to the notes they explain.",
					"Give people a way to add or update information as they work.",
				],
				example: {
					title: "The Classics",
					text: "I built a reading companion that links books, ideas and a reading plan. Search for a work you know and follow its links to see where it fits.",
					kind: "Live web app",
					href: "https://classics.ourstuff.space/",
				},
			},
		],
	},
	{
		id: "automation",
		name: "Automation",
		about:
			"I built a dashboard that put reporting, flagging, and review in one place. An admin could open a flagged Claude conversation, inspect prompts and tool calls, and ask Claude about the session.",
		intro:
			"I connect tools so you can run recurring reports, review what needs attention, or stop copying the same information by hand.",
		notes: [
			{
				id: "reports",
				title: "Stop rebuilding the same report",
				included: [
					"Agree on what starts the job and what information it needs.",
					"Script the steps that follow a rule.",
					"Give someone a way to review exceptions and retry after a correction.",
				],
				example: {
					title: "Three rows for a weekly report",
					text: "In this practice case, I’d set up a script that accepts rows with a date and sets aside rows with a missing date. With two dated rows and one missing a date, the check is two in the report and one to review. Fill in the date before running that row again.",
					kind: "Simulated case",
					href: "/examples/worked-cases/#report",
				},
			},
			{
				id: "connect",
				title: "Connect the tools you already use",
				included: [
					"Map what one tool needs to pass to the next.",
					"Set up the connection and try it with an agreed sample.",
					"Document where to check what happened if a step fails.",
				],
				example: {
					title: "Paperback orders for Feelings & Needs",
					text: "I use Make to connect my Payhip shop to Lulu for printing and shipping. The site shows the paperback buying path. The order and fulfillment records stay private.",
					kind: "Live site with a private workflow",
					href: "https://feelings.ourstuff.space/",
				},
			},
		],
	},
	{
		id: "ai",
		name: "AI",
		about:
			"I set up AI agents with tools, rules, and project context. In my spec reader, Kal points to a passage in the plan and explains the decision so I can review it. I can set up and teach that process.",
		intro:
			"I can set up an AI workflow on your computer and teach you how to give it work, provide the context it needs, and review what it did.",
		notes: [
			{
				id: "ai-workflow",
				serviceId: "ai-coaching",
				title: "Set up AI around your work",
				included: [
					"Pick a project and agree on the part you want the agent to handle.",
					"Set up access to the right tools and project notes.",
					"Show you how to hand off work and check what comes back.",
				],
				example: {
					title: "Reviewing a draft with Kal",
					text: "In Kal Résumé Editor, the writer asks a question beside the passage it concerns. Kal can reply there, and the writer decides what to change. See how I set up the interaction and what stays under the writer’s control.",
					kind: "Project overview",
					href: "https://joerice.me/kal-resume-editor/",
				},
			},
			{
				id: "coach",
				serviceId: "ai-coaching",
				title: "Learn AI on a task you know",
				included: [
					"Pick a task and bring a sample you can share.",
					"Try a prompt together and compare the output with what you need.",
					"Practice catching missing details and deciding what needs your judgment.",
				],
				example: {
					title: "Turn sample meeting notes into next steps",
					text: "In a practice session, I’d ask you to mark who agreed to do what in a short set of notes. Then we’d compare the AI’s list with the notes and catch any owner or deadline it added on its own.",
					kind: "Illustrative exercise",
					href: "/examples/worked-cases/#meeting",
				},
			},
			{
				id: "ai-draft-review",
				title: "Bring AI feedback into a draft",
				included: [
					"Choose what you want help reviewing.",
					"Keep suggestions next to the passage they refer to.",
					"Let the writer decide which edits fit.",
				],
				example: {
					title: "Kal Résumé Editor",
					text: "My résumé editor project uses comments in a private Google Doc to ask for and receive feedback. Read how it handles comments and suggested wording. The document and editing session stay private.",
					kind: "Project overview",
					href: "https://joerice.me/kal-resume-editor/",
				},
			},
		],
	},
	{
		id: "games",
		name: "Games",
		about:
			"I’m building browser games, including Bryan’s fishing game and a hockey game. You can try the first fishing interaction. If you have an idea for a small arcade game, I can help make it playable.",
		intro:
			"I make browser games and test what it feels like to pick them up and play.",
		notes: [
			{
				id: "play",
				title: "Turn a game idea into something you can play",
				included: [
					"Agree on what the player does in the first few moments.",
					"Build a small playable version and test the controls.",
					"Use what players try and where they get stuck to guide the next pass.",
				],
				example: {
					title: "Play on Fishing with Big Pig",
					text: "I worked on the game experience for Bryan’s fishing site. Open the Play page and try the first interaction for yourself.",
					kind: "Playable example",
					href: "https://fwbp.net/play/",
				},
			},
		],
	},
	{
		id: "writing",
		name: "Writing & Design",
		about:
			"I can typeset a manuscript, use AI to help proofread, and review changes with you. For Feelings & Needs, I worked on the book and designed the site so readers could try a few pages before buying.",
		intro:
			"I help turn manuscripts into books and give people’s work a layout and visual style that fits.",
		notes: [
			{
				id: "manuscript",
				title: "Take a manuscript through typesetting and proof",
				included: [
					"Set the page size, typography, and layout for your book.",
					"Review proofreading suggestions together, with AI assistance if you want it.",
					"Check a proof you can read page by page.",
				],
				example: {
					title: "The Manual for Feelings and Needs",
					text: "Open the sample to see how the book introduces the topic and lays out entries someone can refer back to.",
					kind: "Sample PDF",
					href: "https://feelings.ourstuff.space/preview/htHOW",
				},
			},
			{
				id: "logo",
				serviceId: "logo-design",
				title: "A logo that fits your work",
				included: [
					"Talk through what you do, who it’s for and where the logo needs to work.",
					"Compare a small set of ideas at real sizes.",
					"Prepare the chosen logo for the places you’ll use it.",
				],
				example: {
					title: "Try the mark at the size people will see it",
					text: "For a small business, I’d check the same mark in a phone header and on a square profile image. The check is whether you can still recognize it at either size. I’m still selecting a logo project to share here.",
					kind: "Illustrative example",
				},
			},
			{
				id: "resume",
				serviceId: "resume-writing",
				title: "A résumé that shows what you did",
				included: [
					"Choose experience that fits the kind of work you want.",
					"Describe what you did and what came out of it using details you can support.",
					"Review suggested wording together before you send it.",
				],
				example: {
					title: "Review a draft with Kal Résumé Editor",
					text: "I set up the project so a writer could ask for feedback on a passage and review suggestions in context. The public overview shows how the writer stays in charge of each edit.",
					kind: "Project overview",
					href: "https://joerice.me/kal-resume-editor/",
				},
			},
		],
	},
];
