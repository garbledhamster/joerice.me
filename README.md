# joerice.me

Joe Rice's personal portfolio website - a single-page application built with vanilla HTML, CSS, and JavaScript.

## 🛠️ Development Tools

This project uses several tools to maintain code quality and consistency:

### Linting & Formatting Tools

1. **Biome** - Formatter and linter for JavaScript, CSS, and JSON, with linting for standalone HTML
2. **html-validate** - HTML structure and accessibility validator
3. **Nu Html Checker (vnu)** - W3C standards compliance checker
4. **Stylelint** - CSS linter
5. **ESLint** - JavaScript linter and code quality checker

## 📦 Setup

Use Node.js 24 LTS. From the repository root, run `nvm use` if you use nvm. GitHub Actions reads the same version from `.nvmrc`.

```bash
npm ci
npm run check:all
```

Commit `package-lock.json` with dependency changes. GitHub Actions uses it to key the npm cache and install the same dependencies.

## Code quality checks

`npm run check:all` runs the two required checks from the **Code Quality Checks** job. `npm run format:check` checks JavaScript, JSON, and CSS formatting. `npm run lint:biome` runs Biome lint and assist checks, including on standalone HTML. Both commands leave files untouched. Run `npm run format` when you want Biome to apply formatting. The Husky pre-commit hook runs the read-only checks too.

The checks in `biome.json` allow three existing rules to report warnings on two specific files. `contribute.html` has three icon links with missing anchor text and placeholder destinations, and the browser-test fixture has two callbacks that return values to `forEach`. Biome also reports CSS specificity and `!important` warnings and a few JavaScript warnings. Markdown, YAML, and HTML formatting are outside the required format scope. The broad formatter flagged existing Markdown and YAML files.

The job reports these advisory results separately. These counts come from the existing site before the redesign, with the restored tool configurations.

| Command | Baseline findings |
| --- | --- |
| `npm run lint:html` | 33 findings about self-closing void tags and link text on standalone pages. |
| `npm run lint:css` | 885 findings, mostly class naming, spacing, and color notation. |
| `npm run lint:js` | 12 findings about empty blocks and unused variables. |

Run `npm run lint` to include the advisory linters in a local check. Run `npm run lint:html:vnu` with Java for an additional HTML standards check. The Jekyll layouts and reading-link source pages contain Liquid and front matter. Verify them through the separate Pages build and the [reading-link checks](docs/reading-links.md). Before release, record passing Code Quality runs on the pull request and the exact release candidate, plus the separate Pages build result.

## Working Folder browser check

With Playwright and its Chromium browser available, run `node tests/working-folder-browser-test.cjs` from the checkout. The test serves the Working Folder on loopback and uses local doubles for Firebase, CAPTCHA, and quote delivery. Set `WORKING_FOLDER_CAPTURES` to an output directory to save the viewport captures. The separate HTML fixtures in `tests/` exercise the incumbent archive, quote transport, and legacy admin editor.

See [Editing site content](docs/content-editing.md#working-folder) to update the Working Folder in the repository, review it on the private Mac preview, and undo a trial edit.

Kal’s tour uses the compact Builder guide panel: a portrait and motion, voice, and lock controls above a monospace message, with Back, Main menu, and Next below it. Update the portfolio’s stops and mounting options in `assets/js/folder/kal-tour.js`. The bundled presentation runtime in `assets/vendor/ai-helpers-presentation.js` includes the Builder panel and its icon licenses; update the script’s version query when replacing it. `assets/js/folder/kal-voice.js` connects the voice button to the browser’s available speech engine. Narration starts when the visitor presses Play, follows the current guide, and stops when Kal closes or a site dialog opens. Voice availability and sound depend on the visitor’s browser and installed voices.

## 📝 Code Style Guidelines

### JavaScript
- **Formatting** fits the Biome configuration. It uses tabs, double quotes, and semicolons.
- **Module system**: ES6 modules

### CSS
- **Properties**: Use standard CSS properties
- **Custom properties**: Use CSS variables defined in `:root`

### HTML
- **Void elements**: Self-closing (e.g., `<img />`)
- **Attributes**: Always quoted
- **Accessibility**: Include ARIA labels where appropriate

## 🏗️ Project Structure

```
├── index.html           # Main HTML file
├── styles.css           # Main stylesheet
├── assets/
│   ├── js/              # JavaScript modules
│   └── images/          # Images and assets
├── posts/               # Blog posts (YAML files)
├── quotes/              # Quotes collection
└── package.json         # Project dependencies and scripts
```

## 🔒 Security

- Firebase integration for authentication and content management
- Content Security Policy (CSP) for XSS protection
- DOMPurify for HTML sanitization

## 📄 License

ISC

## 👤 Author

Joe Rice

---

For more information about contributing or development practices, please refer to the individual tool documentation linked in their configuration files.
