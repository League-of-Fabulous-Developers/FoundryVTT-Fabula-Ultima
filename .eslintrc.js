module.exports = {
	root: true,
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	plugins: ['prettier'],
	parserOptions: {
		ecmaVersion: 2023,
		sourceType: 'module',
	},
	rules: {
		'prettier/prettier': 'error',
		indent: ['error', 'tab', { SwitchCase: 1 }],
		'no-undef': 'off',
		'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
	},
};
