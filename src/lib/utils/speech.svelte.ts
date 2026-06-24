function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
	return (
		voices.find((voice) => voice.lang === 'ko-KR') ??
		voices.find((voice) => voice.lang.startsWith('ko'))
	);
}

const RATE_KEY = 'hanflow:speech-rate';
// Normal is slightly slower than the browser default to help learners follow.
const NORMAL_RATE = 0.9;
const SLOW_RATE = 0.6;

function loadRate(): number {
	if (typeof localStorage === 'undefined') return NORMAL_RATE;
	const stored = Number(localStorage.getItem(RATE_KEY));
	return stored === SLOW_RATE || stored === NORMAL_RATE ? stored : NORMAL_RATE;
}

function createSpeechStore() {
	const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

	let speakingId = $state<string | null>(null);
	let rate = $state(loadRate());

	// Some browsers load the voice list asynchronously — request it once eagerly
	// so it's populated by the time the user first presses a speak button.
	if (isSupported) {
		window.speechSynthesis.getVoices();
	}

	function speak(text: string, id: string) {
		if (!isSupported) return;

		window.speechSynthesis.cancel();

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'ko-KR';
		utterance.rate = rate;

		const voice = pickKoreanVoice(window.speechSynthesis.getVoices());
		if (voice) {
			utterance.voice = voice;
		}

		utterance.onstart = () => {
			speakingId = id;
		};
		utterance.onend = () => {
			speakingId = null;
		};
		utterance.onerror = () => {
			speakingId = null;
		};

		window.speechSynthesis.speak(utterance);
	}

	function stop() {
		if (!isSupported) return;

		window.speechSynthesis.cancel();
		speakingId = null;
	}

	function setRate(value: number) {
		rate = value;
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(RATE_KEY, String(value));
		} catch {
			/* private mode / quota — rate preference is best-effort */
		}
	}

	return {
		isSupported,
		NORMAL_RATE,
		SLOW_RATE,
		get speakingId() {
			return speakingId;
		},
		get rate() {
			return rate;
		},
		speak,
		stop,
		setRate
	};
}

export const speech = createSpeechStore();
