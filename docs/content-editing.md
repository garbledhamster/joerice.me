# Editing site content

## Working Folder

The Working Folder reads its copy from this repository. In your checkout,
run `git diff -- <file>` before editing to see work already in progress.
Keep a copy of the file as it is if you want to try a change and undo it.

Edit the existing
entry in [the note catalog](../assets/js/folder/starting-catalog.js) to change
the title, included work, example or position. Move the entry between category
lists to change its category. Keep its ID when it represents the same note,
since the board uses the ID to keep the visitor’s place during a visit.

Edit [the route copy](../assets/js/folder/contents.js) for the employer
summary, selected work and the guide. When updating an example, check that
its title, visitor task and description of Joe’s contribution all refer to
the linked destination. Use a complete HTTPS URL for external sites. Keep
the existing relative addresses for bundled practice cases and label sample
data as such. A note without a link offers the existing inquiry action.

Run the [Working Folder browser check](../README.md#working-folder-browser-check)
from your checkout to test the current files with disposable data. To see the
edit on the private Mac preview, copy the changed file to the same relative
path in the approved preview’s site directory, then reload the preview.
For example, copy `assets/js/folder/starting-catalog.js` to
`assets/js/folder/starting-catalog.js` under that directory.

Open the changed category and peel the note through its title, included work
and example. Follow the link, then return and use **Back** to check where
focus lands. Repeat at desktop and phone widths. For route copy, open
`/#guide` or `/#employers`, follow the changed link, then close the sheet and
check that you return to the board.

To undo a trial edit, reverse just the lines you changed in your editor.
If nobody else edited the file during the trial, you can restore your saved
copy instead. Copy that restored file to the preview’s site directory and
reload the same address. Check `git diff -- <file>` again to confirm earlier
edits are still there.

Before releasing the redesign, compare any published Firestore Working
Folder note, layout and copy overrides with the repository versions. Record
what should carry over before updating the source. The Working Folder has no
visitor-facing editor. The existing custom post and service records continue
to feed the public archive and form.

## Incumbent site administration (legacy)

These procedures describe the incumbent site and its legacy admin fixture.
Use the repository steps above to maintain the Working Folder.

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

### Firebase storage for incumbent posts and services

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

`tests/single-page-browser-test.html` runs the incumbent UI with disposable
in-memory Firebase data. Add
`?manual=service` or `?manual=post` for a disposable admin editor preview, or
`?manual=related` for a populated related-post card preview.

### Incumbent post browsing

Work & notes shows six posts per page, with pinned posts above the list. Search,
service/topic, and post-type filters work across the complete collection. A
related-service link opens the matching page and clears browsing filters.

Website project posts can include a `websiteUrl` so visitors can open the site
from the collapsed list. Use a complete HTTP or HTTPS address. The direct link
remains separate from the post title and survives the first Firebase save.

Bundled YAML posts may include `postType` (`project`, `article`, `note`, or
`product`) and `productName`. Posts without a type appear as articles. The list
shows the type, product name, related service names, or existing topic tags.
Service names follow the current catalog, including admin edits. Preserve these
optional fields when updating a Firebase post; ordinary saves merge with the
existing record.

## Joe's comments

*Leave feedback on post browsing or content editing here.*
