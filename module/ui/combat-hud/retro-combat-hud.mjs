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
				systemTemplatePath(`ui/combat-hud/retro/npcs`),
				systemTemplatePath(`ui/combat-hud/retro/characters`),
				systemTemplatePath(`ui/combat-hud/combat-hud-portrait`),
				systemTemplatePath(`ui/combat-hud/retro/bar`),
				systemTemplatePath('ui/combat-hud/retro/bar-hp'),
				systemTemplatePath('ui/combat-hud/retro/bar-mp'),
				systemTemplatePath('ui/combat-hud/retro/bar-ip'),
				systemTemplatePath('ui/combat-hud/retro/bar-exp'),
				systemTemplatePath('ui/combat-hud/retro/bar-fp'),
				systemTemplatePath('ui/combat-hud/retro/bar-zeropower'),
				systemTemplatePath('ui/combat-hud/retro/bar-zenit'),
			],
		},
	};

	get _elementClass() {
		return 'combat-hud-retro';
	}

	_getResourcePartial(resource) {
		if (resource === 'none') return null;

		return systemTemplatePath(`ui/combat-hud/retro/bar`);
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
