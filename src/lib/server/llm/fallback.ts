/**
 * Run `primary`; on any thrown error, run `fallback` once. Mirrors the legacy
 * parseSentence behavior (any error → a single fallback attempt), reusable per
 * aspect. If `fallback` also throws, its error propagates.
 */
export async function tryWithFallback<T>(
	primary: () => Promise<T>,
	fallback: () => Promise<T>
): Promise<T> {
	try {
		return await primary();
	} catch {
		return await fallback();
	}
}
