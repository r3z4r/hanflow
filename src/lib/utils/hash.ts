export async function hashSentence(text: string): Promise<string> {
	const normalized = text.trim().normalize('NFC');
	const encoded = new TextEncoder().encode(normalized);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
