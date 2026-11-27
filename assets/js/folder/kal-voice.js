import { kalNarrationTracks } from "./kal-narration-tracks.js";

// Match Builder's prerecorded narration and opt-in playback.
export function createPortfolioVoice(onVoicing) {
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	const button = document.createElement("button");
	button.type = "button";
	button.className = "kal-guide-icon kal-guide-voice";

	const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("fill", "none");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-width", "2");
	icon.setAttribute("stroke-linejoin", "round");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	icon.append(path);
	button.append(icon);

	let track;
	let context;
	let buffer;
	let playback;
	let offset = 0;
	let autoplay = false;
	let pending;

	function speechFrame() {
		if (!playback) return;
		const audio = playback.source.buffer;
		const samples = audio.getChannelData(0);
		const time = offset + Math.max(0, context.currentTime - playback.startedAt);
		const start = Math.floor(time * audio.sampleRate);
		const end = Math.min(samples.length, start + audio.sampleRate * 0.035);
		let energy = 0;
		let count = 0;
		for (let i = start; i < end; i += 3) {
			energy += samples[i] ** 2;
			count++;
		}
		const level = count ? Math.sqrt(energy / count) : 0;
		return { time, mouth: level < 0.015 ? 0 : level < 0.065 ? 1 : 2 };
	}

	function sync() {
		const active = Boolean(pending || playback);
		const label = active
			? "Pause Kal’s voice"
			: offset
				? "Resume Kal’s voice"
				: "Play Kal’s voice";
		button.setAttribute("aria-label", label);
		button.title = AudioContext
			? label
			: "Voice playback is unavailable in this browser";
		button.disabled = !AudioContext || !track;
		path.setAttribute("d", active ? "M8 5v14M16 5v14" : "M6 4l14 8-14 8z");
		onVoicing(Boolean(playback), speechFrame);
	}

	function cancel() {
		pending?.abort();
		pending = undefined;
		const previous = playback;
		playback = undefined;
		previous?.source.stop();
	}

	async function play() {
		if (!AudioContext || !track) return;
		const request = new AbortController();
		pending = request;
		sync();
		try {
			context ??= new AudioContext();
			if (context.state !== "running") await context.resume();
			if (pending !== request) return;
			let audio = buffer;
			if (!audio) {
				const response = await fetch(
					new URL(`../../audio/kal/${track}`, import.meta.url),
					{ signal: request.signal },
				);
				if (!response.ok) throw new Error("Narration clip unavailable");
				audio = await context.decodeAudioData(await response.arrayBuffer());
			}
			// A close, pause, or new caption can supersede an in-flight decode.
			if (pending !== request) return;
			buffer = audio;
			const source = context.createBufferSource();
			source.buffer = audio;
			source.connect(context.destination);
			source.onended = () => {
				source.disconnect();
				if (playback?.source !== source) return;
				playback = undefined;
				offset = 0;
				sync();
			};
			const startedAt = context.currentTime;
			source.start(startedAt, offset);
			playback = { source, startedAt };
			pending = undefined;
			sync();
		} catch {
			if (pending !== request) return;
			pending = undefined;
			autoplay = false;
			sync();
			button.title = "Kal’s voice could not play. Try again.";
		}
	}

	button.addEventListener("click", () => {
		if (pending || playback) {
			if (playback) {
				offset += context.currentTime - playback.startedAt;
				if (offset >= buffer.duration) offset = 0;
			}
			autoplay = false;
			cancel();
			sync();
		} else {
			autoplay = true;
			void play();
		}
	});

	function show(line = "") {
		const nextTrack = Object.hasOwn(kalNarrationTracks, line)
			? kalNarrationTracks[line]
			: undefined;
		if (nextTrack === track) return;
		cancel();
		track = nextTrack;
		buffer = undefined;
		offset = 0;
		if (autoplay && track) void play();
		else sync();
	}

	function stop() {
		autoplay = false;
		show();
	}
	sync();
	window.addEventListener("pagehide", stop);
	return { button, show, stop };
}
