# Book companion links

The printed QR codes use these permanent addresses:

| Book | Printed address |
| --- | --- |
| The Classics | https://joerice.me/read/classics/ |
| Feelings and Needs | https://joerice.me/read/feelings/ |

Keep the printed addresses and their source pages in place so existing books keep working. To send readers somewhere else, edit that book’s `url` in `_data/reading_links.yml` and publish the change to `main`. That map is the single source for the destinations. Use a complete HTTPS address.

GitHub Pages already builds this site with Jekyll. The shared `_layouts/read-redirect.html` layout reads the map and generates the automatic redirect and the visible fallback link. The two source pages select their book by key. This is HTML forwarding, rather than an HTTP 302 response. Meta refresh works when JavaScript is disabled; JavaScript uses `location.replace` so Back does not reopen the forwarding page.

Before publishing, run `ruby tests/reading-links-test.rb` with the `liquid` 4.x and `nokogiri` gems available, plus Node.js. The focused test renders the real layout, checks both destinations and the no-JavaScript fallback, executes the redirect script, and checks that changing the map updates all three methods with escaped text. These are local test tools; the Pages build needs no new dependency.

After publication, confirm the Pages build succeeded and open both printed addresses. Check JavaScript-disabled forwarding and the fallback links as well. Keep the QR images unchanged when only the destination changes.

## Joe's comments

*Leave feedback on the companion links or where they should send readers.*
