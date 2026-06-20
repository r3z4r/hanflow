// Tracks whether a sentence is currently being analysed, so the global
// LoadingOverlay can cover the LLM parse (the slow POST action) and not just
// the subsequent redirect navigation.
function createParsing() {
	let active = $state(false);

	function start() {
		active = true;
	}

	function stop() {
		active = false;
	}

	return {
		get active() {
			return active;
		},
		start,
		stop,
	};
}

export const parsing = createParsing();
