// Narration starts only after the visitor presses Play.
export function createPortfolioVoice(onVoicing) {
	const speech = window.speechSynthesis;
	const button = document.createElement("button");
	button.type = "button";
	button.className = "kal-guide-icon kal-guide-voice";
	let line = "";
	let utterance;
	let autoplay = false;
	let paused = false;
	let active = false;

	function sync() {
		const label = active
			? "Pause Kal’s voice"
			: paused
				? "Resume Kal’s voice"
				: "Play Kal’s voice";
		button.setAttribute("aria-label", label);
		button.title = speech
			? label
			: "Voice playback is unavailable in this browser";
		button.disabled = !speech || !line;
		const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		icon.setAttribute("viewBox", "0 0 24 24");
		icon.setAttribute("aria-hidden", "true");
		icon.setAttribute("fill", "none");
		icon.setAttribute("stroke", "currentColor");
		icon.setAttribute("stroke-width", "2");
		icon.setAttribute("stroke-linejoin", "round");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", active ? "M8 5v14M16 5v14" : "M6 4l14 8-14 8z");
		icon.append(path);
		button.replaceChildren(icon);
		onVoicing(active);
	}

	function cancel() {
		const previous = utterance;
		utterance = undefined;
		if (previous) speech.cancel();
		active = paused = false;
	}

	function speak() {
		if (!speech || !line) return;
		cancel();
		const next = new SpeechSynthesisUtterance(line);
		next.lang = "en-US";
		next.rate = 0.94;
		const voices = speech.getVoices();
		const localVoice = voices.find(
			(voice) => voice.localService && /^en\b/i.test(voice.lang),
		);
		if (localVoice) next.voice = localVoice;
		utterance = next;
		function finish() {
			if (utterance !== next) return;
			utterance = undefined;
			active = paused = false;
			sync();
		}
		next.onend = finish;
		next.onerror = finish;
		active = true;
		if (speech.paused) speech.resume();
		speech.speak(next);
		sync();
	}

	button.addEventListener("click", () => {
		if (!speech) return;
		if (active) {
			speech.pause();
			active = autoplay = false;
			paused = true;
			sync();
		} else if (paused && utterance) {
			speech.resume();
			paused = false;
			active = autoplay = true;
			sync();
		} else {
			autoplay = true;
			speak();
		}
	});

	function show(text = "") {
		if (text === line) return;
		cancel();
		line = text;
		if (autoplay && line) speak();
		else sync();
	}

	function stop() {
		autoplay = false;
		cancel();
		line = "";
		sync();
	}
	window.addEventListener("pagehide", stop);
	return { button, show, stop };
}
