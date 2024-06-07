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
			ActiveEffectConfig: 'readonly',
			Actor: 'readonly',
			ActorSheet: 'readonly',
			Actors: 'readonly',
			Application: 'readonly',
			CONFIG: 'readonly',
			CONST: 'readonly',
			ChatMessage: 'readonly',
			Combat: 'readonly',
			CombatTracker: 'readonly',
			Combatant: 'readonly',
			Dialog: 'readonly',
			DocumentSheet: 'readonly',
			FilePicker: 'readonly',
			Folder: 'readonly',
			FormApplication: 'readonly',
			Handlebars: 'readonly',
			Hooks: 'readonly',
			InteractionLayer: 'readonly',
			Item: 'readonly',
			ItemSheet: 'readonly',
			Items: 'readonly',
			JournalEntry: 'readonly',
			KeyboardManager: 'readonly',
			Macro: 'readonly',
			Roll: 'readonly',
			RollTable: 'readonly',
			SearchFilter: 'readonly',
			SettingsConfig: 'readonly',
			TextEditor: 'readonly',
			canvas: 'readonly',
			foundry: 'readonly',
			fromUuid: 'readonly',
			game: 'readonly',
			getDocumentClass: 'readonly',
			loadTemplates: 'readonly',
			renderTemplate: 'readonly',
			ui: 'readonly',
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
