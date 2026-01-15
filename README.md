# joerice.me

Personal portfolio website for Joe Rice built with vanilla HTML, CSS, and JavaScript, with Firebase integration.

## Features

- **Portfolio/Blog** - Posts stored as YAML files with markdown content
- **Gallery** - Image slideshow with Firebase Storage backend
- **Quotes** - Rotating quotes section
- **Contact Form** - Contact form for visitors
- **Admin Panel** - Firebase authentication for content management

## Firebase Setup

This site uses Firebase for:
- **Authentication** - Email link sign-in for admin access
- **Firestore** - Storing posts, quotes, and image metadata
- **Storage** - Hosting gallery images

### Deploying Firebase Rules

To deploy Firestore and Storage security rules to Firebase:

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize your Firebase project (if not already done):
   ```bash
   firebase use --add
   ```
   Select your Firebase project and give it an alias (e.g., "default")

4. Deploy only the security rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

   Or deploy everything (hosting, rules):
   ```bash
   firebase deploy
   ```

### Security Rules

- **Firestore Rules** (`firestore.rules`) - Controls access to posts, images, and quotes in Firestore database
- **Storage Rules** (`storage.rules`) - Controls access to uploaded images in Firebase Storage

Both rule files restrict write access to the admin user (jmjrice94@gmail.com) while allowing public read access.

## Local Development

This is a static site - simply open `index.html` in a browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

Then navigate to `http://localhost:8000`

## Project Structure

```
├── index.html              # Main HTML file
├── styles.css              # Stylesheet
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
├── storage.rules           # Storage security rules
├── assets/
│   ├── js/
│   │   ├── main.js         # Main entry point
│   │   ├── auth.js         # Firebase authentication
│   │   ├── gallery.js      # Gallery functionality
│   │   ├── posts.js        # Blog posts
│   │   ├── quotes.js       # Quotes management
│   │   ├── contact.js      # Contact form
│   │   ├── dom.js          # DOM utilities
│   │   └── tooltips.js     # Tooltip functionality
│   └── images/             # Static images
├── posts/                  # Blog posts (YAML files)
└── quotes/                 # Quotes (YAML files)
```

## Content Management

### Adding Posts

Create a new YAML file in the `posts/` directory:

```yaml
id: 0001
title: "Post Title"
date: 2025-05-03
pinned: false
tags: []
content: |
  Your markdown content here
```

### Adding Quotes

Edit `quotes/quotes.yaml`:

```yaml
quotes:
  - text: "Quote text"
    author: "Author name"
```

### Managing Gallery Images

Gallery images are managed through the admin interface:
1. Sign in as admin
2. Click "Edit Gallery"
3. Upload images with captions
4. Edit or delete existing images

## License

Personal portfolio - all rights reserved.
