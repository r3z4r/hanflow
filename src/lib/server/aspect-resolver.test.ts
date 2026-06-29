import { describe, it, expect, vi } from 'vitest';
import { resolveAspect, type AspectResolverIO } from './aspect-resolver';

// A minimal stand-in value typed as the result; the orchestrator is shape-agnostic.
const VALUE = { translation: 'hi' } as unknown as Awaited<ReturnType<AspectResolverIO['compute']>>;

function io(overrides: Partial<AspectResolverIO>): AspectResolverIO {
	return {
		hotGet: vi.fn(async () => null),
		coldGet: vi.fn(async () => null),
		hotSet: vi.fn(async () => {}),
		coldSet: vi.fn(async () => {}),
		validate: (raw) => raw as never,
		compute: vi.fn(async () => VALUE),
		...overrides
	};
}

describe('resolveAspect', () => {
	it('returns a valid hot hit without touching cold or compute', async () => {
		const i = io({ hotGet: vi.fn(async () => VALUE) });
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.coldGet).not.toHaveBeenCalled();
		expect(i.compute).not.toHaveBeenCalled();
	});

	it('on a cold hit, reseeds hot and returns without computing', async () => {
		const i = io({ coldGet: vi.fn(async () => VALUE) });
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
		expect(i.compute).not.toHaveBeenCalled();
	});

	it('on a full miss, computes and writes both tiers', async () => {
		const i = io({});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.compute).toHaveBeenCalledOnce();
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
		expect(i.coldSet).toHaveBeenCalledWith(VALUE);
	});

	it('treats an invalid hot entry as a miss and falls through to cold', async () => {
		const i = io({
			hotGet: vi.fn(async () => ({ corrupt: true })),
			coldGet: vi.fn(async () => VALUE),
			validate: (raw) => ('corrupt' in (raw as object) ? null : (raw as never))
		});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.hotSet).toHaveBeenCalledWith(VALUE);
	});

	it('treats invalid hot and cold as a miss and computes', async () => {
		const i = io({
			hotGet: vi.fn(async () => ({ corrupt: true })),
			coldGet: vi.fn(async () => ({ corrupt: true })),
			validate: () => null
		});
		expect(await resolveAspect(i)).toBe(VALUE);
		expect(i.compute).toHaveBeenCalledOnce();
	});
});
