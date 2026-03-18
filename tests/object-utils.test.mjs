import { describe, it, expect } from 'vitest';
import { ObjectUtils } from '../module/helpers/object-utils.mjs';

describe('mergeRecursive', () => {
	it('merges a flat source into a flat target', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: 1 }, { b: 2 });
		expect(result).toEqual({ a: 1, b: 2 });
		expect(changed).toBe(true);
	});

	it('returns changed=false when source adds nothing new', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: 1 }, { a: 1 });
		expect(result).toEqual({ a: 1 });
		expect(changed).toBe(false);
	});

	it('overwrites a target value when source differs', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: 1 }, { a: 2 });
		expect(result.a).toBe(2);
		expect(changed).toBe(true);
	});

	it('merges nested objects recursively', () => {
		const target = { a: { x: 1 } };
		const source = { a: { y: 2 } };
		const [result, changed] = ObjectUtils.mergeRecursive(target, source);
		expect(result).toEqual({ a: { x: 1, y: 2 } });
		expect(changed).toBe(true);
	});

	it('creates a nested key in target if it does not exist', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({}, { a: { b: 1 } });
		expect(result).toEqual({ a: { b: 1 } });
		expect(changed).toBe(true);
	});

	it('treats arrays as plain values, not objects', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: [1] }, { a: [2, 3] });
		expect(result.a).toEqual([2, 3]);
		expect(changed).toBe(true);
	});

	it('does not mutate source', () => {
		const source = { a: { b: 1 } };
		ObjectUtils.mergeRecursive({}, source);
		expect(source).toEqual({ a: { b: 1 } });
	});

	it('handles an empty source', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: 1 }, {});
		expect(result).toEqual({ a: 1 });
		expect(changed).toBe(false);
	});

	it('handles an empty target', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({}, { a: 1 });
		expect(result).toEqual({ a: 1 });
		expect(changed).toBe(true);
	});

	it('handles null values in source', () => {
		const [result, changed] = ObjectUtils.mergeRecursive({ a: 1 }, { a: null });
		expect(result.a).toBeNull();
		expect(changed).toBe(true);
	});
});

describe('cleanObject', () => {
	it('removes undefined properties', () => {
		expect(ObjectUtils.cleanObject({ a: 1, b: undefined })).toEqual({ a: 1 });
	});

	it('keeps null properties', () => {
		expect(ObjectUtils.cleanObject({ a: null })).toEqual({ a: null });
	});

	it('keeps false and zero', () => {
		expect(ObjectUtils.cleanObject({ a: false, b: 0 })).toEqual({ a: false, b: 0 });
	});

	it('keeps empty string', () => {
		expect(ObjectUtils.cleanObject({ a: '' })).toEqual({ a: '' });
	});

	it('returns empty object when all values are undefined', () => {
		expect(ObjectUtils.cleanObject({ a: undefined, b: undefined })).toEqual({});
	});

	it('returns empty object for empty input', () => {
		expect(ObjectUtils.cleanObject({})).toEqual({});
	});
});

describe('pick', () => {
	it('returns only the specified keys', () => {
		expect(ObjectUtils.pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
	});

	it('ignores keys that do not exist in the record', () => {
		expect(ObjectUtils.pick({ a: 1 }, ['a', 'b'])).toEqual({ a: 1 });
	});

	it('returns an empty object when no keys match', () => {
		expect(ObjectUtils.pick({ a: 1 }, ['b', 'c'])).toEqual({});
	});

	it('returns an empty object for an empty keys array', () => {
		expect(ObjectUtils.pick({ a: 1 }, [])).toEqual({});
	});

	it('returns an empty object for an empty record', () => {
		expect(ObjectUtils.pick({}, ['a'])).toEqual({});
	});

	it('preserves falsy values', () => {
		expect(ObjectUtils.pick({ a: 0, b: false, c: null }, ['a', 'b', 'c'])).toEqual({
			a: 0,
			b: false,
			c: null,
		});
	});
});

describe('deepFreeze', () => {
	it('freezes a flat object', () => {
		const obj = ObjectUtils.deepFreeze({ a: 1 });
		expect(Object.isFrozen(obj)).toBe(true);
	});

	it('freezes nested objects', () => {
		const obj = ObjectUtils.deepFreeze({ a: { b: { c: 1 } } });
		expect(Object.isFrozen(obj.a)).toBe(true);
		expect(Object.isFrozen(obj.a.b)).toBe(true);
	});

	it('prevents modification of a frozen object', () => {
		const obj = ObjectUtils.deepFreeze({ a: 1 });
		expect(() => {
			'use strict';
			obj.a = 2;
		}).toThrow();
	});

	it('returns the same object reference', () => {
		const obj = { a: 1 };
		expect(ObjectUtils.deepFreeze(obj)).toBe(obj);
	});

	it('does not re-freeze already frozen nested objects', () => {
		const inner = Object.freeze({ b: 1 });
		const obj = ObjectUtils.deepFreeze({ a: inner });
		expect(Object.isFrozen(obj.a)).toBe(true);
	});

	it('handles an empty object', () => {
		const obj = ObjectUtils.deepFreeze({});
		expect(Object.isFrozen(obj)).toBe(true);
	});
});
