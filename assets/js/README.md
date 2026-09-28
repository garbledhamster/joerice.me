# JavaScript Architecture

This codebase uses a modular SPA (Single Page Application) architecture designed for maintainability and ease of modification by LLMs.

## Directory Structure

```
assets/js/
├── main.js              # Entry point - orchestrates app initialization
├── core/                # Core utilities and infrastructure
│   ├── dom.js           # DOM utilities ($, $$, lockScroll, etc.)
│   ├── router.js        # Hash-based SPA router
│   └── state.js         # Simple state management
├── components/          # Reusable UI components
│   ├── header.js        # Site header with navigation
│   ├── modal.js         # Modal dialog system
│   └── card.js          # Card templates (service, entry, etc.)
├── pages/               # Page-specific modules
│   ├── home.js          # Home page (hero + intro)
│   ├── portfolio.js     # Portfolio with posts
│   ├── gallery.js       # Image gallery slideshow
│   ├── hire.js          # Services cards
│   ├── quotes.js        # Quotes carousel
│   ├── contact.js       # Contact form
│   └── links.js         # Useful links
├── services/            # External service integrations
│   ├── auth.js          # Authentication (Firebase Auth)
│   ├── firebase.js      # Firebase initialization
│   └── sanitize.js      # XSS protection utilities
└── ui/                  # Legacy UI utilities (kept for compatibility)
    └── layout.js        # Layout management
```

## Module Conventions

### Page Modules (`pages/*.js`)

Each page module exports:
- `get<Page>Template()` - Returns HTML string for the page
- `render<Page>()` - Renders page to #mainContent
- `init<Page>()` - Initializes page interactivity
- `destroy<Page>()` - Cleans up event listeners

Example:
```javascript
// pages/example.js
export function getExampleTemplate() { return `<section>...</section>`; }
export function renderExample() { /* render to DOM */ }
export function initExample() { /* setup listeners */ }
export function destroyExample() { /* cleanup */ }
```

### Component Modules (`components/*.js`)

Components export:
- Template functions: `get<Component>Template()`
- Init functions: `init<Component>()`
- Destroy functions: `destroy<Component>()`

### Core Modules (`core/*.js`)

- `dom.js` - DOM utilities (always import from here)
- `router.js` - Navigation (registerRoute, navigate, etc.)
- `state.js` - App state (getState, setState, subscribe)

### Service Modules (`services/*.js`)

- `auth.js` - User authentication, admin checks
- `firebase.js` - Firebase initialization
- `sanitize.js` - Input/output sanitization

## Routing

Routes are hash-based (e.g., `#/home`, `#/portfolio`).

Register routes in `main.js`:
```javascript
registerRoutes({
  '/home': renderHome,
  '/portfolio': renderPortfolio,
});
```

Navigate programmatically:
```javascript
import { navigate } from './core/router.js';
navigate('/portfolio');
```

## State Management

Simple key-value state with subscriptions:
```javascript
import { getState, setState, subscribe } from './core/state.js';

// Get state
const isAdmin = getState('isAdmin');

// Set state
setState('isAdmin', true);

// Subscribe to changes
subscribe('isAdmin', (value, prev) => {
  console.log('Admin changed:', prev, '->', value);
});
```

## Adding a New Page

1. Create `pages/newpage.js` with the standard exports
2. Add route in `main.js`:
   ```javascript
   import { renderNewpage, destroyNewpage } from './pages/newpage.js';

   const routes = {
     // ...existing routes
     '/newpage': createPageRenderer(renderNewpage, destroyNewpage),
   };
   ```
3. Add navigation link in `components/header.js` navItems array

## Key Files to Modify

- **Add/change pages**: `pages/*.js` + `main.js` routes
- **Change navigation**: `components/header.js`
- **Change auth logic**: `services/auth.js`
- **Change styling**: `styles.css` (root level)
- **Change app shell**: `main.js` initApp()

## External Dependencies

Loaded via CDN in `index.html`:
- Firebase (auth, firestore, storage)
- Marked.js (markdown parsing)
- DOMPurify (XSS protection)
- js-yaml (YAML parsing)
- Font Awesome (icons)
- Google Fonts (typography)
