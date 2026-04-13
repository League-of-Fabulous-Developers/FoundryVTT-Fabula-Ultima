import { BaseCombatHUD } from './base-combat-hud.mjs';

export class RetroCombatHUD extends BaseCombatHUD {
	static DEFAULT_OPTIONS = {
		...super.DEFAULT_OPTIONS,
		classes: [...super.DEFAULT_OPTIONS.classes, 'combat-hud-retro'],
	};

	get _elementClass() {
		return 'combat-hud-retro';
	}
}

BaseCombatHUD.RegisterCombatHUDClass({
	id: 'fu-default',
	cls: RetroCombatHUD,
	get name() {
		return CONFIG?.FU?.combatHudThemes['fu-default'];
	},
});
