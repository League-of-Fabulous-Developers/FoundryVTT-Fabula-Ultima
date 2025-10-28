import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	{
		name: 'projectfu/tooling',
		files: ['tools/*.mjs'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		name: 'projectfu/system',
		files: ['**/*.{js,mjs,cjs}'],
		ignores: ['tools/*.mjs'],
		plugins: { js },
		extends: ['js/recommended'],
		rules: {
			'no-unused-vars': [
				'error',
				{
					args: 'none',
					caughtErrors: 'none',
				},
			],
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jquery,
				ActiveEffect: 'readonly',
				Actor: 'readonly',
				CONFIG: 'readonly',
				CONST: 'readonly',
				ChatMessage: 'readonly',
				Combat: 'readonly',
				Combatant: 'readonly',
				FilePicker: 'readonly',
				Folder: 'readonly',
				Handlebars: 'readonly',
				Hooks: 'readonly',
				InteractionLayer: 'readonly',
				Item: 'readonly',
				Items: 'readonly',
				JournalEntry: 'readonly',
				KeyboardManager: 'readonly',
				Macro: 'readonly',
				Roll: 'readonly',
				RollTable: 'readonly',
				SearchFilter: 'readonly',
				SettingsConfig: 'readonly',
				TextEditor: 'readonly',
				VideoHelper: 'readonly',
				canvas: 'readonly',
				foundry: 'readonly',
				fromUuid: 'readonly',
				game: 'readonly',
				getDocumentClass: 'readonly',
				loadTemplates: 'readonly',
				ui: 'readonly',
				fromUuidSync: 'readonly',
			},
		},
	},
]);
