function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
	return (
		voices.find((voice) => voice.lang === 'ko-KR') ??
		voices.find((voice) => voice.lang.startsWith('ko'))
	);
}

function createSpeechStore() {
	const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

	let speakingId = $state<string | null>(null);

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
		// Slightly slower than default — easier for learners to follow.
		utterance.rate = 0.9;

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

	return {
		isSupported,
		get speakingId() {
			return speakingId;
		},
		speak,
		stop
	};
}

export const speech = createSpeechStore();
