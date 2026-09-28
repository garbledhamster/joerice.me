# joerice.me

Joe Rice's personal portfolio website - a single-page application built with vanilla HTML, CSS, and JavaScript.

## 🛠️ Development Tools

This project uses several tools to maintain code quality and consistency:

### Linting & Formatting Tools

1. **Biome** - Fast formatter and linter for HTML, CSS, and JavaScript
2. **html-validate** - HTML structure and accessibility validator
3. **Nu Html Checker (vnu)** - W3C standards compliance checker
4. **Stylelint** - CSS linter and formatter
5. **ESLint** - JavaScript linter and code quality checker

## 📦 Setup

Install dependencies:

```bash
npm install
```

## 🚀 Available Scripts

### Formatting

```bash
# Format all code (HTML, CSS, JS)
npm run format

# Check formatting without changing files
npm run format:check
```

### Linting

```bash
# Run all linters
npm run lint

# Run individual linters
npm run lint:biome    # Biome linter (HTML, CSS, JS)
npm run lint:html     # HTML validation
npm run lint:html:vnu # Nu Html Checker (standards compliance)
npm run lint:css      # Stylelint (CSS linting)
npm run lint:js       # ESLint (JavaScript linting)

# Check everything (format + lint)
npm run check:all
```

## 🔧 Tool Configuration

Each tool has its own configuration file:

- **Biome**: `biome.json`
- **html-validate**: `.htmlvalidate.json`
- **Stylelint**: `.stylelintrc.json`
- **ESLint**: `eslint.config.js`

## 🪝 Git Hooks

Pre-commit hooks are automatically set up using Husky:

- **Before every commit**: Biome runs automatically to format and lint your code
- This ensures all committed code follows the project's style guidelines

## 📝 Code Style Guidelines

### JavaScript
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Module system**: ES6 modules

### CSS
- **Indentation**: 2 spaces
- **Properties**: Use standard CSS properties
- **Custom properties**: Use CSS variables defined in `:root`

### HTML
- **Void elements**: Self-closing (e.g., `<img />`)
- **Attributes**: Always quoted
- **Accessibility**: Include ARIA labels where appropriate

## 🎯 When to Run Each Tool

| Tool | When to Run | Purpose |
|------|-------------|---------|
| **Biome** | Before every commit (automatic) | Format + lint HTML/CSS/JS, catches basic bugs |
| **html-validate** | After editing pages/layouts | Prevents invalid markup and accessibility issues |
| **Nu Html Checker** | Before major releases | Ensures spec-correct and cross-browser HTML |
| **Stylelint** | After styling changes | Catches invalid CSS properties and bad patterns |
| **ESLint** | After script changes | Prevents runtime errors and unsafe JavaScript code |

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
