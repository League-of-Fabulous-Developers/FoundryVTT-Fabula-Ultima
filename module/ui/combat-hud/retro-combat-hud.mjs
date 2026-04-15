import { SYSTEM } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { SETTINGS } from '../../settings.js';
import { BaseCombatHUD } from './base-combat-hud.mjs';

export class RetroCombatHUD extends BaseCombatHUD {
	static DEFAULT_OPTIONS = {
		...super.DEFAULT_OPTIONS,
		classes: [...super.DEFAULT_OPTIONS.classes, 'combat-hud-retro'],
	};

	static PARTS = {
		...super.PARTS,
		hud: {
			template: systemTemplatePath(`ui/combat-hud/combat-hud-default`),
			templates: [
				systemTemplatePath(`ui/partials/combat-bar-exp`),
				systemTemplatePath(`ui/partials/combat-bar-fp`),
				systemTemplatePath(`ui/partials/combat-bar-hp`),
				systemTemplatePath(`ui/partials/combat-bar-ip`),
				systemTemplatePath(`ui/partials/combat-bar-mp`),
				systemTemplatePath(`ui/partials/combat-bar-zenit`),
				systemTemplatePath(`ui/partials/combat-bar-zeropower`),
				systemTemplatePath(`ui/partials/combat-hud-turn`),
			],
		},
	};

	get _elementClass() {
		return 'combat-hud-retro';
	}

	async _prepareContext(options = {}) {
		const context = await super._prepareContext(options);
		context.buttonPositionClass = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPositionButton) === 'top' ? 'combat-hud-retro__window-button--top' : 'combat-hud-retro__window-button--bottom';
		return context;
	}
}

BaseCombatHUD.RegisterCombatHUDClass({
	id: 'fu-default',
	cls: RetroCombatHUD,
	get name() {
		return CONFIG?.FU?.combatHudThemes['fu-default'];
	},
});
