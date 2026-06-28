import { describe, it, expect } from 'vitest';
import { sseFrame } from './sse';

describe('sseFrame', () => {
	it('formats an event + JSON data frame ending in a blank line', () => {
		expect(sseFrame('aspect', { ordinal: 0, aspect: 'translation' })).toBe(
			'event: aspect\ndata: {"ordinal":0,"aspect":"translation"}\n\n'
		);
	});

	it('serializes an empty object for done', () => {
		expect(sseFrame('done', {})).toBe('event: done\ndata: {}\n\n');
	});
});
