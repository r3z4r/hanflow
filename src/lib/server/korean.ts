const HANGUL_RE = /^[가-힣ㄱ-ㆎ \p{P}]+$/u;

export function isHangulOnly(text: string): boolean {
	return HANGUL_RE.test(text.trim());
}

/**
 * Normalize raw user input for analysis. Never throws. Fixes the common ways
 * pasted text is "dirty" without rejecting it: NFC composition, control/zero-width
 * removal, full-width→half-width ASCII, whitespace tidy. Newlines are preserved as
 * segment boundaries.
 */
export function normalizeInput(raw: string): string {
	return raw
		.normalize('NFC')
		.replace(/[\x00-\x09\x0b-\x1f\x7f\u200b-\u200d\ufeff]/g, '') // control + zero-width (preserves newlines)
		.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)) // full-width ASCII
		.replace(/　/g, ' ') // ideographic space
		.replace(/[ \t]+/g, ' ')
		.replace(/[ \t]*\n[ \t]*/g, '\n') // tidy around newlines, keep the break
		.replace(/\n{2,}/g, '\n')
		.trim();
}

const HAS_HANGUL_RE = /[가-힣ㄱ-ㆎ]/u;

/**
 * The input gate for analysis: accept anything containing at least some Hangul.
 * Mixed/messy text passes; pure non-Korean is handled with a soft hint upstream
 * (not a hard rejection styled as an error).
 */
export function containsHangul(text: string): boolean {
	return HAS_HANGUL_RE.test(text);
}
