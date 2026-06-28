import { describe, it, expect, vi } from 'vitest';
import { tryWithFallback } from './fallback';

describe('tryWithFallback', () => {
	it('returns the primary result and never calls fallback when primary succeeds', async () => {
		const fallback = vi.fn(async () => 'fallback');
		expect(await tryWithFallback(async () => 'primary', fallback)).toBe('primary');
		expect(fallback).not.toHaveBeenCalled();
	});

	it('falls back once when primary throws', async () => {
		const result = await tryWithFallback(
			async () => {
				throw new Error('primary down');
			},
			async () => 'fallback'
		);
		expect(result).toBe('fallback');
	});

	it('rejects with the fallback error when both throw', async () => {
		await expect(
			tryWithFallback(
				async () => {
					throw new Error('primary');
				},
				async () => {
					throw new Error('fallback');
				}
			)
		).rejects.toThrow('fallback');
	});
});
