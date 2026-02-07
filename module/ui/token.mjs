import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { FUPressureGauge } from './pressureGauges/pressure-gauge.mjs';

export class FUToken extends foundry.canvas.placeables.Token {
	destroy() {
		super.destroy();
		if (this.pressureGauge) this.pressureGauge.destroy();
	}

	_createPressureGauge() {
		let theme = game.settings.get(SYSTEM, SETTINGS.optionPressureGaugeTheme);
		let pressureGaugeClass = undefined;

		if (theme === 'hudTheme') {
			const hudTheme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme);
			const hudPressureTheme = Object.values(FU.pressureGaugeThemes).find((item) => item.combatHudTheme === hudTheme);
			pressureGaugeClass = hudPressureTheme;
		} else if (FU.pressureGaugeThemes[theme]) {
			pressureGaugeClass = FU.pressureGaugeThemes[theme];
		}
		if (!pressureGaugeClass) pressureGaugeClass = FUPressureGauge;

		if (this.pressureGauge) this.pressureGauge.destroy();
		this.pressureGauge = new pressureGaugeClass(this);
		this.addChild(this.pressureGauge);
		this.pressureGauge.refresh();
	}

	_refreshPressureGauge(force = false) {
		if (force) {
			this.pressureGauge.destroy();
			this._createPressureGauge();
		}
		this.pressureGauge.refresh();
	}

	_refreshMesh() {
		super._refreshMesh();
		this.pressureGauge?.refresh();
	}

	_refreshSize() {
		super._refreshSize();
		this.pressureGauge?.refresh(true);
	}

	_refreshPosition() {
		super._refreshPosition();
		this.pressureGauge?.refresh();
	}

	_refreshEffects() {
		super._refreshEffects();
		this.pressureGauge?.refresh();
	}

	constructor(...args) {
		super(...args);
		this._createPressureGauge();
	}
}
