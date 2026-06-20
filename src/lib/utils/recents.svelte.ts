const STORAGE_KEY = 'hanflow:recent';
const MAX_RECENTS = 3;

function load(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
	} catch {
		return [];
	}
}

function persist(items: string[]) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		/* private mode / quota exceeded — recents are best-effort, never block input */
	}
}

function createRecents() {
	let items = $state<string[]>(load());

	function add(sentence: string) {
		const text = sentence.trim();
		if (!text) return;
		// De-dupe by moving an existing entry to the top, then cap the list.
		items = [text, ...items.filter((s) => s !== text)].slice(0, MAX_RECENTS);
		persist(items);
	}

	return {
		get items() {
			return items;
		},
		add,
	};
}

export const recents = createRecents();
