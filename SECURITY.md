# Security Implementation Guide

## Overview

This document describes the security measures implemented in joerice.me to protect against common web vulnerabilities, particularly Cross-Site Scripting (XSS) attacks.

## Security Measures

### 1. Content Sanitization with DOMPurify

**Library**: DOMPurify v3.0.6 (loaded from CDN)

All user-generated content is sanitized before being rendered in the DOM to prevent XSS attacks.

#### Sanitization Module (`assets/js/sanitize.js`)

The sanitization module provides the following functions:

- **`sanitizeHtml(html, options)`** - Sanitizes HTML content with configurable allowed tags and attributes
- **`sanitizeText(text)`** - Escapes all HTML entities for safe plain text rendering
- **`sanitizeMarkdown(markdown)`** - Parses markdown and sanitizes the resulting HTML
- **`sanitizeUrl(url)`** - Validates URLs and blocks dangerous protocols (javascript:, data:, vbscript:)
- **`validateLength(input, maxLength)`** - Validates and truncates input to prevent abuse

#### Protected Content Areas

1. **Portfolio Posts** (`assets/js/posts.js`)
   - Post content: Sanitized markdown rendering
   - Post titles: HTML entity escaping
   - Post tags: HTML entity escaping
   - Input limits: 500 chars for titles, 50,000 chars for content

2. **Quotes** (`assets/js/quotes.js`)
   - Quote text: HTML entity escaping
   - Quote author: HTML entity escaping
   - Input limits: 1,000 chars for quotes, 200 chars for authors

3. **Gallery** (`assets/js/gallery.js`)
   - Image captions: HTML entity escaping
   - Image URLs: URL validation and sanitization
   - Input limits: 500 chars for captions

### 2. Content Security Policy (CSP)

A Content Security Policy is implemented via meta tag in `index.html`:

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.gstatic.com https://formspree.io
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com
img-src 'self' https: data: blob:
connect-src 'self' https://formspree.io https://firebasestorage.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self' https://formspree.io
```

**What this does:**
- Restricts script sources to trusted CDNs only
- Prevents loading resources from untrusted domains
- Blocks framing of the site (prevents clickjacking)
- Restricts form submissions to trusted endpoints

**Known Limitation**: `'unsafe-inline'` is currently required for:
- Firebase inline initialization script (lines 206-214 in index.html)
- Inline year update script (lines 217-219 in index.html)
- Some inline styles in the HTML

**Security Trade-off**: While `'unsafe-inline'` weakens CSP protection, the risk is mitigated by:
1. All user-generated content is sanitized with DOMPurify before rendering
2. The inline scripts are static and controlled by the site owner
3. Firebase authentication controls who can modify content
4. The CSP still blocks external script sources

**Future Improvement**: Consider these options to remove `'unsafe-inline'`:
- Use CSP nonces for inline scripts (requires server-side implementation)
- Move Firebase config and year script to an external JS file
- Use a build process to generate nonces at deployment time

### 3. Firebase Security Rules

#### Firestore Rules (`firestore.rules`)

All Firestore collections follow the principle of least privilege:

- **Read access**: Public (anyone can read)
- **Write access**: Admin only (requires authentication as admin email)

Protected collections:
- `Posts` - Blog posts and portfolio items
- `Images` - Gallery image metadata
- `Quotes` - Quote collection
- `siteContent` - Site-wide content (e.g., quotes document)

#### Storage Rules (`storage.rules`)

Firebase Storage follows the same pattern:

- **Read access**: Public (anyone can download images)
- **Write access**: Admin only (only admin can upload/delete)

### 4. Authentication

**Admin Email**: Hardcoded in `auth.js` and security rules

All administrative functions require:
1. User authentication via Firebase Auth (email link)
2. Email verification (must match admin email)
3. Frontend checks via `ensureAdmin()` function
4. Backend enforcement via Firebase security rules

### 5. Input Validation

All user inputs are validated before storage:

| Input Type | Maximum Length | Validation Function |
|------------|----------------|---------------------|
| Post Title | 500 characters | `validateLength()` |
| Post Content | 50,000 characters | `validateLength()` |
| Quote Text | 1,000 characters | `validateLength()` |
| Quote Author | 200 characters | `validateLength()` |
| Image Caption | 500 characters | `validateLength()` |

Inputs exceeding these limits are automatically truncated.

## Security Best Practices for Developers

### When Adding New Features

1. **Always sanitize user input before rendering**
   ```javascript
   import { sanitizeText, sanitizeHtml } from './sanitize.js';
   
   // For plain text
   element.textContent = sanitizeText(userInput);
   
   // For HTML content
   element.innerHTML = sanitizeHtml(userInput);
   
   // For markdown
   import { sanitizeMarkdown } from './sanitize.js';
   element.innerHTML = sanitizeMarkdown(markdownContent);
   ```

2. **Validate input lengths**
   ```javascript
   import { validateLength } from './sanitize.js';
   const validInput = validateLength(userInput, 500);
   ```

3. **Check authentication for admin actions**
   ```javascript
   import { ensureAdmin } from './auth.js';
   if (!ensureAdmin('action description')) return;
   ```

4. **Add Firestore rules for new collections**
   ```
   match /NewCollection/{document} {
     allow read: if true;
     allow create, update, delete: if isAdmin();
   }
   ```

### Common Vulnerabilities to Avoid

❌ **NEVER do this:**
```javascript
// Direct innerHTML with user content
element.innerHTML = userInput;

// Template literals with user content
element.innerHTML = `<div>${userContent}</div>`;

// eval() or Function() with user input
eval(userInput);
```

✅ **DO this instead:**
```javascript
// Use textContent for plain text
element.textContent = userInput;

// Or sanitize before using innerHTML
import { sanitizeText } from './sanitize.js';
element.innerHTML = `<div>${sanitizeText(userContent)}</div>`;
```

## Testing Security

### Manual Testing

1. **Test XSS Protection**
   - Try entering `<script>alert('XSS')</script>` in any text field
   - Verify it's escaped or stripped, not executed

2. **Test URL Validation**
   - Try entering `javascript:alert('XSS')` as a URL
   - Verify it's blocked or sanitized

3. **Test Input Length Limits**
   - Try entering very long strings (>50,000 chars)
   - Verify they're truncated

4. **Test Authentication**
   - Try accessing admin functions without login
   - Verify they're blocked

### Automated Testing

Run CodeQL security scanner:
```bash
# This is run automatically as part of the PR process
# Check for vulnerabilities
```

## Incident Response

If a security vulnerability is discovered:

1. **Assess the severity** - Can it be exploited? What data is at risk?
2. **Disable the vulnerable feature** - If possible, temporarily disable it
3. **Deploy a fix** - Implement proper sanitization/validation
4. **Review all similar code** - Check for the same pattern elsewhere
5. **Update documentation** - Add the pattern to this guide

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2026-01-15 | GitHub Copilot | Multiple XSS vulnerabilities in posts, quotes, and gallery | Fixed |

---

**Last Updated**: 2026-01-15
**Version**: 1.0
