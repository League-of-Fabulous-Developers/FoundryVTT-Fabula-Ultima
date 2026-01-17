// import { SYSTEM } from '../helpers/config.mjs';
// import { SETTINGS } from '../settings.js';
import { FUPressureGauge } from './pressureGauges/pressure-gauge.mjs';

export class FUToken extends foundry.canvas.placeables.Token {
	pressureGauge = new FUPressureGauge(this);

	destroy() {
		super.destroy();
		if (this.pressureGauge) this.pressureGauge.destroy();
	}

	_refreshMesh() {
		super._refreshMesh();
		this.pressureGauge.refresh();
	}

	_refreshSize() {
		super._refreshSize();
		this.pressureGauge.refresh();
	}

	_refreshPosition() {
		super._refreshPosition();
		this.pressureGauge.refresh();
	}

	_refreshEffects() {
		super._refreshEffects();
		this.pressureGauge.refresh();
	}

	constructor(...args) {
		super(...args);
		this.addChild(this.pressureGauge);
	}
}
