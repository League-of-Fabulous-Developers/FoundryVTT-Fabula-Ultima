import { defineConfig } from 'vitest/config';
export default defineConfig({
	test: {
		root: '.',
		environment: 'node',
		include: ['tests/**/*.{test,spec}.{js,mjs}', 'tests/**/*-test.{js,mjs}'],
		globals: true,
	},
});
