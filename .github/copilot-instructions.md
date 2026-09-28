# Copilot Instructions for joerice.me

## Repository Overview

This is Joe Rice's personal portfolio website. It is a single-page application built with vanilla HTML, CSS, and JavaScript, with Firebase integration for authentication and content management.

## Website Structure

The website consists of six core components:

1. **Navigation Bar** - Site header with brand, menu toggle, and navigation links
2. **Bio/Description** - Hero section with profile picture, intro text, and social media links
3. **Portfolio (Posts)** - Blog posts and articles stored as YAML files with markdown content
4. **Gallery** - Image slideshow with captions showcasing various themes
5. **Quotes** - Rotating quotes section with favorite quotes stored in YAML format
6. **Contact Form** - Contact form for visitors to reach out

## File Structure

```
├── index.html           # Main HTML file with all sections
├── styles.css           # Main stylesheet
├── assets/
│   └── js/
│       ├── main.js      # Main JavaScript module (entry point)
│       ├── auth.js      # Firebase authentication logic
│       ├── posts.js     # Portfolio posts management
│       ├── quotes.js    # Quotes management
│       ├── contact.js   # Contact form handling
│       ├── dom.js       # DOM utilities
│       ├── tooltips.js  # Tooltip functionality
│       └── ui/
│           └── layout.js # Layout/UI utilities
│   └── images/
│       └── pictures/    # Profile and other images
├── posts/               # Blog posts as YAML files
│   ├── 0001.yaml
│   ├── 0002.yaml
│   ├── loader.yaml      # Post loader configuration
│   └── ...
├── quotes/
│   └── quotes.yaml      # Quotes collection
├── firestore.rules      # Firebase security rules
└── manifest.json        # PWA manifest
```

## Technical Conventions

### HTML Structure
- Uses semantic HTML5 elements
- Sections use `id` attributes for navigation anchors
- Admin-only elements use `data-admin-only` attribute
- Modals use ARIA attributes for accessibility

### CSS Conventions
- Uses CSS custom properties (variables) defined in `:root`
- Color scheme: --bg (white), --fg (black), --border, --blue, --red, --yellow, --rose, --green, --purple
- Typography: Space Grotesk for body, Bebas Neue for headings, Fira Code for code
- Responsive design with `clamp()` for fluid sizing
- Mobile-first approach

### JavaScript
- ES6 modules (`type="module"`)
- Firebase SDK v9 in compat mode
- External libraries: marked.js (Markdown), js-yaml (YAML parsing)
- Event delegation pattern for dynamic content

### Content Format

#### Posts (YAML)
```yaml
id: 0001
title: "Post Title"
date: 2025-05-03
pinned: true|false
tags: []
content: |
  Markdown content here
```

#### Quotes (YAML)
```yaml
quotes:
  - text: "Quote text"
    author: "Author name"
```

## Development Guidelines

1. **Styling**: Match existing design patterns and color scheme
2. **Accessibility**: Include proper ARIA labels and semantic markup
3. **Performance**: Keep the site lightweight; avoid unnecessary dependencies
4. **Content**: Posts use Markdown format within YAML files
5. **Firebase**: All dynamic content management uses Firestore
6. **Mobile**: Ensure responsive design works on all screen sizes

## Build & Deploy

- This is a static site hosted directly (no build process required)
- Changes to HTML/CSS/JS are immediately reflected
- Posts and quotes are loaded dynamically from YAML files
- Firebase configuration is embedded in index.html

## Admin Features

- Login system using Firebase Auth (email link authentication)
- Admin-only edit buttons for managing:
  - Portfolio posts (add, edit, delete)
  - Gallery images
  - Quotes collection
- All admin features require authentication

## Common Tasks

- **Adding a post**: Create new YAML file in `/posts/` with sequential numbering
- **Adding a quote**: Edit `/quotes/quotes.yaml` and add to the array
- **Styling changes**: Modify `styles.css` using existing CSS variables
- **Functionality**: JavaScript is modular:
  - `main.js` - Entry point and initialization
  - `auth.js` - Authentication features
  - `posts.js` - Portfolio/blog functionality
  - `quotes.js` - Quotes management
  - `contact.js` - Contact form
  - Other modules for specific features

## Code Style

- Use consistent indentation (2 spaces)
- Keep inline styles minimal; prefer CSS classes
- Use descriptive class names and IDs
- Comment complex logic
- Follow existing naming conventions
