# Editing site text

Each visible section gets one Markdown file in this folder. Edit these files in Notepad, Notepad++, Obsidian, or any plain text editor.

The terminal keeps the interface text separate from reading text. `index.html` owns commands, routes, prompts, and the map. These files own the words people read.

Supported Markdown:

- `# Heading`
- `**bold text**`
- `*italic text*`
- `[link text](https://example.com)`
- `[open a section](/About)`
- `[run a command](command:open Projects)`
- `inline terminal text`
- fenced terminal blocks
- simple Markdown tables

Tables render as ASCII tables in the terminal:

| Column | Meaning |
|---|---|
| Route | The command path in `index.html` |
| File | The Markdown file in `content/` |

Keep the content plaintext. Avoid HTML, embedded widgets, image cards, or visual layouts.
