import { describe, it, expect } from 'vitest';
import { buildAspectPrompt } from './index';

describe('buildAspectPrompt', () => {
	it('translation: asks for a natural translation and echoes the text', () => {
		const { system, prompt } = buildAspectPrompt('translation', '저는 학교에 갑니다');
		expect(system.toLowerCase()).toContain('natural');
		expect(prompt).toContain('저는 학교에 갑니다');
	});

	it('structure: states tok_N rule, particle mapping, and morphemes; no romanization', () => {
		const { system } = buildAspectPrompt('structure', '막혔을 때');
		expect(system).toContain('tok_0');
		expect(system).toContain('은/는');
		expect(system.toLowerCase()).toContain('morpheme');
		expect(system.toLowerCase()).not.toContain('romanization');
	});

	it('pronunciation: requires Revised Romanization', () => {
		const { system } = buildAspectPrompt('pronunciation', '먹어요');
		expect(system).toContain('Revised Romanization');
	});

	it('glossary: mentions example sentences', () => {
		const { system } = buildAspectPrompt('glossary', '학교');
		expect(system.toLowerCase()).toContain('example');
	});
});
