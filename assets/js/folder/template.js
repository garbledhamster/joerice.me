export function folderTemplate({
	login,
	postEditor,
	quote,
	work,
	products,
	services,
	personal,
	employers,
	guide,
}) {
	return `
		<a class="skip" href="#whiteboard">Skip to the whiteboard</a>
		<div class="folder">
			<header class="masthead">
				<a class="wordmark" href="#about" aria-label="Joe Rice home">Joe Rice.</a>
				<a class="hire phone-hire" href="#hire" data-route="hire">Hire me →</a>
				<nav class="site-links" aria-label="Joe’s sites">
					<a href="https://ourstuff.space/">Ourstuff</a>
					<a href="https://classics.ourstuff.space/">The Classics</a>
					<a href="https://feelings.ourstuff.space/">Feelings &amp; Needs</a>
				</nav>
			</header>
			<div class="workspace">
				<nav class="rail categories" aria-label="Service categories"></nav>
				<main id="whiteboard" class="whiteboard" tabindex="-1">
					<div class="phone-picker">
						<label for="folder-category">Category</label><select id="folder-category"></select>
					</div>
					<div class="track"></div>
				</main>
				<nav class="rail destinations" aria-label="More from Joe">
					<a class="hire desktop-hire" href="#hire" data-route="hire">Hire me</a>
					<a href="#employers" data-route="employers">For employers</a>
					<a href="#work" data-route="work">Work &amp; Notes</a>
					<a href="#personal" data-route="personal">Personal</a>
				</nav>
			</div>
			<footer class="guide">
				<a href="#guide" data-route="guide">How to build an idea →</a>
				<div class="admin-actions">
					<a class="login-control" href="#loginModal" id="loginButton">Login</a>
				</div>
			</footer>
		</div>
		<dialog class="route-sheet" aria-labelledby="folder-sheet-title">
			<div class="sheet-heading">
				<button class="back" data-close type="button">← Back to board</button>
			</div>
			<div class="route-body">
				<h1 id="folder-sheet-title" tabindex="-1"></h1>
				<div data-sheet="hire" hidden>${quote}</div>
				<div data-sheet="work" hidden>${work}${postEditor}</div>
				<div data-sheet="employers" hidden>${employers}</div>
				<div data-sheet="personal" hidden>${personal}</div>
				<div data-sheet="guide" hidden>${guide}</div>
				<div data-sheet="products" hidden>${products}</div>
				<div data-sheet="edit-services" hidden>${services}</div>
				<div data-sheet="edit-content" hidden></div>
			</div>
		</dialog>
		${login}
	`;
}
