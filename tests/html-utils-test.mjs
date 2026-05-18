import { describe, it, expect } from 'vitest';

import { HTMLUtils } from '../module/helpers/html-utils.mjs';

describe('getAspectRatio', () => {
	describe('common aspect ratios', () => {
		it('resolves 1920x1080 to 16/9', () => {
			const { w, h } = HTMLUtils.getAspectRatio(1920, 1080);
			expect(w).toBe(16);
			expect(h).toBe(9);
		});

		it('resolves 800x600 to 4/3', () => {
			const { w, h } = HTMLUtils.getAspectRatio(800, 600);
			expect(w).toBe(4);
			expect(h).toBe(3);
		});

		it('resolves 627x425 to 627/425 (no common divisor)', () => {
			const { w, h } = HTMLUtils.getAspectRatio(627, 425);
			expect(w).toBe(627);
			expect(h).toBe(425);
		});
	});

	describe('ratio string format', () => {
		it('returns a correctly formatted CSS ratio string', () => {
			const { ratio } = HTMLUtils.getAspectRatio(1920, 1080);
			expect(ratio).toBe('16 / 9');
		});

		it('ratio string matches w and h values', () => {
			const { ratio, w, h } = HTMLUtils.getAspectRatio(800, 600);
			expect(ratio).toBe(`${w} / ${h}`);
		});
	});

	describe('edge cases', () => {
		it('resolves a square image to 1/1', () => {
			const { w, h } = HTMLUtils.getAspectRatio(512, 512);
			expect(w).toBe(1);
			expect(h).toBe(1);
		});

		it('handles non-standard sizes with a common divisor', () => {
			const { w, h } = HTMLUtils.getAspectRatio(300, 200);
			expect(w).toBe(3);
			expect(h).toBe(2);
		});

		it('handles 1x1', () => {
			const { w, h } = HTMLUtils.getAspectRatio(1, 1);
			expect(w).toBe(1);
			expect(h).toBe(1);
		});

		it('handles very large dimensions', () => {
			const { w, h } = HTMLUtils.getAspectRatio(7680, 4320);
			expect(w).toBe(16);
			expect(h).toBe(9);
		});
	});
});
