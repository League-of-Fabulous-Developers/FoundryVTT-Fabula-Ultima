import { SYSTEM } from '../../helpers/config.mjs';
import { FUHooks } from '../../hooks.mjs';
import { SETTINGS } from '../../settings.js';
import { BaseCombatHUD } from './base-combat-hud.mjs';

Hooks.once(FUHooks.GET_SIDEBAR_TOOLS, (tools) => {
	tools.push({
		id: 'combathud',
		label: 'FU.ExperimentalCombatHudSettings',
		icon: 'fa-solid fa-book',
		tools: {
			toggleHud: {
				label: 'FU.CombatHudControlButtonTitle',
				icon: 'fa-solid fa-thumbtack',
				click: () => {
					BaseCombatHUD.update();
				},
			},
			savePos: {
				label: 'FU.CombatHudSaveButtonTitle',
				icon: 'fa-solid fa-lock',
				click: () => {
					const isSaved = game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved);
					game.settings.set(SYSTEM, SETTINGS.optionCombatHudSaved, !isSaved);
				},
			},
			resetHud: {
				label: 'FU.CombatHudResetButtonTitle',
				icon: 'fa-solid fa-undo',
				click: () => {
					BaseCombatHUD.update();
				},
			},
		},
	});
});

Hooks.on('renderCombatTracker', (app, element) => {
	BaseCombatHUD.update();
});

Hooks.on('initializeCombatConfiguration', (config) => {
	console.log('Combat HUD:', config);
});
