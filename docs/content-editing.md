# Editing site content

Sign in with the existing admin account. Use **Edit** beside any portfolio
title (including “Who is Joe Rice?”), or **Add Post** for a new post. The inline
editor includes related-service checkboxes. Save writes to Firebase; failed
saves leave the form open with its contents intact.

In Services, use **Edit** or **Add service** to change names, descriptions,
highlights, and availability. Turning availability off hides the service from
visitors without deleting its record or breaking existing post references.

Visitors can select services on cards or inside related posts. The shared
bottom banner shows the count and jumps to the contact form. Per-service
project details accompany the contact message.

Flip a service card and choose **Related posts** to browse its tagged, published
posts inside the card. **Details** restores the service highlights;
choosing a title opens that post's expanding portfolio reader. Drafts are never
listed here. Saved tag changes refresh the list immediately, and open post
editors pick up newly available services without clearing their current tags.
The selection footer stays separate from browsing controls. **Close** returns
to the front without clearing the selection; tapping the content won't flip it.

## Firebase storage

All records use the existing `Posts` collection and its current admin-write /
published-read permissions. No browser local storage is used for saved content.

- Regular posts store `title`, `body`, `published`, `pinned`, and `serviceIds`.
  Legacy capitalized title/body/published fields are kept in sync on save.
- Service records have `kind: "service"`, a stable `serviceId`, `available`,
  `description`, `highlights`, and `published: true`. Their document IDs start
  with `service-`. They are excluded from the portfolio list.
- A bundled YAML post is copied to `imported-0001` (and so on) on its first
  admin save. An atomic batch also creates a public `kind: "source-override"`
  marker with the original `sourceUrl`. This marker contains no post body and
  prevents the bundled original returning when its replacement is unpublished
  or deleted. Do not remove these markers when removing imported posts.

`tests/single-page-browser-test.html` runs the real UI against an in-memory
Firebase test double. It does not write to the production database. Add
`?manual=service` or `?manual=post` for a disposable admin editor preview, or
`?manual=related` for a populated related-post card preview.
