const HANGUL_RE = /^[가-힣ㄱ-ㆎ\s\p{P}]+$/u;

export function isHangulOnly(text: string): boolean {
	return HANGUL_RE.test(text.trim());
}
