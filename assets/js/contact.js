import { $ } from "./dom.js";

let modal = null;
let closeModalButton = null;
let contactForm = null;

function openModal() {
	if (!modal) return;
	modal.classList.add("show");
}

function hideModal() {
	if (!modal) return;
	modal.classList.remove("show");
}

export function initContact() {
	modal = $("#modal");
	closeModalButton = $("#closeModal");
	contactForm = $("#contactForm");

	if (closeModalButton) {
		closeModalButton.addEventListener("click", hideModal);
	}

	if (modal) {
		modal.addEventListener("click", (e) => {
			if (e.target === modal) hideModal();
		});
	}

	if (contactForm) {
		contactForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const fd = new FormData(e.target);
			try {
				// Get reCAPTCHA token
				const token = await grecaptcha.execute(
					"6LcYpE4sAAAAALOW_7HWe81eUCnFkGFu-e8dAW_S",
					{ action: "submit" },
				);
				fd.append("g-recaptcha-response", token);

				await fetch("https://formspree.io/f/xovqpvdv", {
					method: "POST",
					body: fd,
					headers: { Accept: "application/json" },
				});
			} catch {}
			e.target.reset();
			openModal();
		});
	}
}
