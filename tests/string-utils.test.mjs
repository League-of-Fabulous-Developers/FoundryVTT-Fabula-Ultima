import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StringUtils } from '../module/helpers/string-utils.mjs'; // adjust path as needed

// ============================================================================
// Minimal mocks for localize / hasLocalization only
// ============================================================================

beforeEach(() => {
	globalThis.game = {
		i18n: {
			localize: vi.fn((key) => `localized:${key}`),
			format: vi.fn((key, data) => `formatted:${key}`),
			translations: { 'FU.ExistingKey': 'Existing' },
			_fallback: { 'FU.FallbackKey': 'Fallback' },
		},
	};
	globalThis.foundry = {
		utils: {
			hasProperty: vi.fn((obj, key) => key.split('.').reduce((o, k) => o?.[k], obj) !== undefined),
		},
	};
});

// ============================================================================
// kebabToPascal
// ============================================================================

describe('kebabToPascal', () => {
	it('converts a single word', () => {
		expect(StringUtils.kebabToPascal('hello')).toBe('Hello');
	});

	it('converts multiple kebab segments', () => {
		expect(StringUtils.kebabToPascal('hello-world')).toBe('HelloWorld');
	});

	it('handles three segments', () => {
		expect(StringUtils.kebabToPascal('my-data-model')).toBe('MyDataModel');
	});

	it('returns empty string unchanged', () => {
		expect(StringUtils.kebabToPascal('')).toBe('');
	});
});

// ============================================================================
// camelToKebab
// ============================================================================

describe('camelToKebab', () => {
	it('converts camelCase to kebab-case', () => {
		expect(StringUtils.camelToKebab('helloWorld')).toBe('hello-world');
	});

	it('handles multiple uppercase letters', () => {
		expect(StringUtils.camelToKebab('myDataModel')).toBe('my-data-model');
	});

	it('adds a hyphen before numbers', () => {
		expect(StringUtils.camelToKebab('level2Attack')).toBe('level-2-attack');
	});

	it('returns lowercase string unchanged', () => {
		expect(StringUtils.camelToKebab('hello')).toBe('hello');
	});

	it('returns empty string unchanged', () => {
		expect(StringUtils.camelToKebab('')).toBe('');
	});
});

// ============================================================================
// titleToKebab
// ============================================================================

describe('titleToKebab', () => {
	it('converts Title Case to kebab-case', () => {
		expect(StringUtils.titleToKebab('Hello World')).toBe('hello-world');
	});

	it('converts camelCase boundaries', () => {
		expect(StringUtils.titleToKebab('helloWorld')).toBe('hello-world');
	});

	it('collapses multiple spaces', () => {
		expect(StringUtils.titleToKebab('Hello   World')).toBe('hello-world');
	});

	it('lowercases the result', () => {
		expect(StringUtils.titleToKebab('HELLO')).toBe('hello');
	});

	it('returns empty string unchanged', () => {
		expect(StringUtils.titleToKebab('')).toBe('');
	});
});

// ============================================================================
// capitalize
// ============================================================================

describe('capitalize', () => {
	it('capitalizes first letter and lowercases rest', () => {
		expect(StringUtils.capitalize('hello')).toBe('Hello');
	});

	it('lowercases subsequent letters', () => {
		expect(StringUtils.capitalize('hELLO')).toBe('Hello');
	});

	it('handles a single character', () => {
		expect(StringUtils.capitalize('a')).toBe('A');
	});

	it('returns non-string input as-is', () => {
		expect(StringUtils.capitalize(42)).toBe(42);
		expect(StringUtils.capitalize(null)).toBe(null);
	});

	it('returns empty string unchanged', () => {
		expect(StringUtils.capitalize('')).toBe('');
	});
});

// ============================================================================
// truncate
// ============================================================================

describe('truncate', () => {
	it('returns the string unchanged if within maxLength', () => {
		expect(StringUtils.truncate('hello', 10)).toBe('hello');
	});

	it('returns the string unchanged if exactly maxLength', () => {
		expect(StringUtils.truncate('hello', 5)).toBe('hello');
	});

	it('truncates at the last whole word and appends ellipsis', () => {
		expect(StringUtils.truncate('hello world foo', 13)).toBe('hello world…');
	});

	it('truncates mid-word if no space is available', () => {
		expect(StringUtils.truncate('helloworld', 5)).toBe('hello…');
	});

	it('returns empty string for non-string input', () => {
		expect(StringUtils.truncate(123, 5)).toBe('');
		expect(StringUtils.truncate(null, 5)).toBe('');
	});

	it('returns empty string for empty input', () => {
		expect(StringUtils.truncate('', 5)).toBe('');
	});
});

// ============================================================================
// toBase64 / fromBase64
// ============================================================================

describe('toBase64 / fromBase64', () => {
	it('encodes and decodes a plain object', () => {
		const original = { name: 'Test Actor', level: 5 };
		const encoded = StringUtils.toBase64(original);
		expect(typeof encoded).toBe('string');
		expect(StringUtils.fromBase64(encoded)).toEqual(original);
	});

	it('encodes and decodes a nested object', () => {
		const original = { a: { b: { c: 42 } } };
		expect(StringUtils.fromBase64(StringUtils.toBase64(original))).toEqual(original);
	});

	it('encodes and decodes an array', () => {
		const original = [1, 2, 3];
		expect(StringUtils.fromBase64(StringUtils.toBase64(original))).toEqual(original);
	});

	it('returns null from toBase64 on non-serializable input', () => {
		const circular = {};
		circular.self = circular;
		expect(StringUtils.toBase64(circular)).toBeNull();
	});

	it('returns null from fromBase64 on invalid input', () => {
		expect(StringUtils.fromBase64('not-valid-base64!!!')).toBeNull();
	});

	it('returns null from fromBase64 on valid base64 that is not JSON', () => {
		expect(StringUtils.fromBase64(btoa('not json'))).toBeNull();
	});
});
