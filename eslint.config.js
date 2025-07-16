import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const tooling = {
	files: ['tools/*.mjs'],
	languageOptions: {
		globals: {
			...globals.node,
		},
	},
};

const foundryvtt = {
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
};

const projectfu = {
	rules: {
		'no-unused-vars': [
			'error',
			{
				args: 'none',
				caughtErrors: 'none',
			},
		],
	},
};

export default [js.configs.recommended, tooling, foundryvtt, projectfu, eslintConfigPrettier];
