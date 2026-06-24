// Learner display preferences (persisted), read by TokenNode (gloss) and the
// sidebars (romanization). TTS speed lives in speech.svelte.ts.
const STORAGE_KEY = 'hanflow:display';

type DisplayPrefs = { glossVisible: boolean; romanizationVisible: boolean };

const DEFAULTS: DisplayPrefs = { glossVisible: true, romanizationVisible: false };

function load(): DisplayPrefs {
	if (typeof localStorage === 'undefined') return DEFAULTS;
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		return {
			glossVisible:
				typeof parsed.glossVisible === 'boolean' ? parsed.glossVisible : DEFAULTS.glossVisible,
			romanizationVisible:
				typeof parsed.romanizationVisible === 'boolean'
					? parsed.romanizationVisible
					: DEFAULTS.romanizationVisible,
		};
	} catch {
		return DEFAULTS;
	}
}

function createDisplay() {
	const initial = load();
	let glossVisible = $state(initial.glossVisible);
	let romanizationVisible = $state(initial.romanizationVisible);

	function persist() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ glossVisible, romanizationVisible }));
		} catch {
			/* private mode / quota — preferences are best-effort */
		}
	}

	function toggleGloss() {
		glossVisible = !glossVisible;
		persist();
	}

	function toggleRomanization() {
		romanizationVisible = !romanizationVisible;
		persist();
	}

	return {
		get glossVisible() {
			return glossVisible;
		},
		get romanizationVisible() {
			return romanizationVisible;
		},
		toggleGloss,
		toggleRomanization,
	};
}

export const display = createDisplay();
