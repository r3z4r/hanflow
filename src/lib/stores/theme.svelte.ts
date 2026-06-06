const STORAGE_KEY = 'hanflow-theme';
type Theme = 'dark' | 'light';

function createThemeStore() {
	const initial: Theme =
		typeof document !== 'undefined'
			? ((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark')
			: 'dark';

	let current = $state<Theme>(initial);

	$effect.root(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', current);
		localStorage.setItem(STORAGE_KEY, current);
	});

	function toggle() {
		current = current === 'dark' ? 'light' : 'dark';
	}

	function set(theme: Theme) {
		current = theme;
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
