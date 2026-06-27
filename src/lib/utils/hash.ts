/**
 * SHA-256 hex of the trimmed, NFC-normalized text. Basis of every cache key
 * (document hash, segment hash) so identical text always maps to one entry.
 */
export async function hashText(text: string): Promise<string> {
	const normalized = text.trim().normalize('NFC');
	const encoded = new TextEncoder().encode(normalized);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Back-compat alias for existing call sites. */
export const hashSentence = hashText;
