# Firebase Storage Permission Fix - Deployment Guide

## Problem
Gallery uploads are failing with this error:
```
Firebase Storage: User does not have permission to access 'Images/...'. (storage/unauthorized)
```

## Root Cause
Your Firebase Storage security rules in the Firebase Console are currently set to deny all access:
```javascript
match /{allPaths=**} {
  allow read, write: if false;
}
```

This blocks all uploads, even from authenticated admin users.

## Solution
Deploy the correct storage rules from this repository to your Firebase project.

## Step-by-Step Instructions

### 1. Install Firebase CLI
If you don't have it already, install the Firebase CLI globally:
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```
This will open a browser window for you to authenticate with your Google account.

### 3. Configure Your Firebase Project
Edit the `.firebaserc` file and replace `your-firebase-project-id` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

You can find your project ID in the Firebase Console at https://console.firebase.google.com/
- Select your project
- Click the gear icon (Project Settings)
- Your Project ID is shown at the top

Alternatively, you can run:
```bash
firebase use --add
```
This will let you select your project from a list.

### 4. Deploy the Security Rules
Deploy ONLY the security rules (won't affect your existing data or hosting):
```bash
firebase deploy --only firestore:rules,storage:rules
```

Or if you want to deploy everything including hosting:
```bash
firebase deploy
```

### 5. Verify the Rules Were Deployed
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Storage** → **Rules**
4. You should see rules that look like:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == "jmjrice94@gmail.com";
    }

    match /Images/{userId}/{imageId} {
      // Anyone can read images
      allow read: if true;
      
      // Only admin can upload, update, or delete images
      allow write: if isAdmin();
    }

    // Default: deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 6. Test the Gallery Upload
1. Go to your website
2. Sign in as admin (jmjrice94@gmail.com)
3. Navigate to the Gallery section
4. Click "Edit Gallery"
5. Try uploading an image

The upload should now work successfully!

## What These Rules Do

- **Read Access**: Anyone can view images stored in the `Images/{userId}/{imageId}` path
- **Write Access**: Only the admin user (jmjrice94@gmail.com) can:
  - Upload new images
  - Update existing images
  - Delete images
- **Default Deny**: All other paths in Storage are blocked for security

## Troubleshooting

### "Permission denied" error
- Make sure you're signed in as jmjrice94@gmail.com
- Check that the rules were deployed successfully
- Wait a few minutes for the rules to propagate

### "Project not found" error
- Verify your project ID in `.firebaserc` is correct
- Make sure you're logged in with the correct Google account
- Try running `firebase use --add` to select your project

### Rules didn't deploy
- Check that you have owner/editor permissions on the Firebase project
- Make sure the `storage.rules` file exists and has no syntax errors
- Try deploying with the `--debug` flag: `firebase deploy --only storage:rules --debug`

## Need Help?
If you continue to have issues, check:
1. Firebase Console → Storage → Rules (verify the rules are correct)
2. Firebase Console → Authentication → Users (verify your email is authenticated)
3. Browser console for any error messages
