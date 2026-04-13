import { BaseCombatHUD } from './base-combat-hud.mjs';

export class RetroCombatHUD extends BaseCombatHUD {
	constructor(options) {
		super(options);
		BaseCombatHUD.instance = this;
	}
}

BaseCombatHUD.RegisterCombatHUDClass({
	id: 'fu-default',
	cls: RetroCombatHUD,
	get name() {
		return CONFIG?.FU?.combatHudThemes['fu-default'];
	},
});
