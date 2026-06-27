import { describe, it, expect } from 'vitest';
import { segmentAspectKey } from './cache-keys';

describe('segmentAspectKey', () => {
	it('builds the namespaced redis key', () => {
		expect(segmentAspectKey('abc123', 'translation')).toBe('hanflow:seg:abc123:translation');
	});

	it('varies by aspect', () => {
		expect(segmentAspectKey('abc123', 'glossary')).toBe('hanflow:seg:abc123:glossary');
	});
});
