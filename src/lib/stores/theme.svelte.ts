const STORAGE_KEY = 'hanflow-theme';
type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', t);
	localStorage.setItem(STORAGE_KEY, t);
}

function createThemeStore() {
	const initial: Theme =
		typeof document !== 'undefined'
			? ((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark')
			: 'dark';

	let current = $state<Theme>(initial);

	function toggle() {
		current = current === 'dark' ? 'light' : 'dark';
		applyTheme(current);
	}

	function set(t: Theme) {
		current = t;
		applyTheme(t);
	}

	return {
		get current() {
			return current;
		},
		toggle,
		set,
	};
}

export const theme = createThemeStore();
