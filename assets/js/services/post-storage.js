import { ensureAdmin, getFirestore } from "./auth.js";

export const importedPostId = (url) =>
	`imported-${url
		.split("/")
		.pop()
		.replace(/\.yaml$/, "")}`;

// The public marker prevents a bundled original from resurfacing when its
// Firebase replacement is unpublished or deleted. It never contains post text.
export async function savePost(post, values) {
	if (!ensureAdmin("save post"))
		throw new Error("Sign in as admin to save posts.");
	const db = getFirestore();
	if (!db) throw new Error("Firebase is unavailable.");
	const posts = db.collection("Posts");
	const id = post?.source === "yaml" ? importedPostId(post.url) : post?.id;
	const ref = id ? posts.doc(id) : posts.doc();
	const now = new Date().toISOString();
	const data = {
		...values,
		// Keep legacy capitalized fields in sync with existing published posts.
		Title: values.title,
		Body: values.body,
		Published: values.published,
		createdDate: post?.createdDate || now,
		lastEditedDate: now,
	};
	if (post?.source === "yaml") {
		const batch = db.batch();
		batch.set(ref, { ...data, sourceUrl: post.url }, { merge: true });
		batch.set(posts.doc(`source-${id}`), {
			kind: "source-override",
			sourceUrl: post.url,
			published: true,
		});
		await batch.commit();
	} else {
		await ref.set(data, { merge: true });
	}
	return ref.id;
}
