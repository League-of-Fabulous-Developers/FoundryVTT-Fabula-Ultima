import { PartyDataModel } from '../documents/actors/party/party-data-model.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { SETTINGS } from '../settings.js';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { FUPressureGauge } from './pressureGauges/pressure-gauge.mjs';

export class FUToken extends foundry.canvas.placeables.Token {
	destroy() {
		super.destroy();
		if (this.pressureGauge) this.pressureGauge.destroy();
	}

	/**
	 * Retrieves the value of a display field, respecting PFU-specific modes
	 * @param {string} field - The name of the field, probably displayName or displayBars
	 */
	_getActualDisplayMode(field) {
		return this.document.flags?.[SYSTEM]?.resourceBars?.[field] ?? this.document[field];
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

	/** @inheritdoc */
	_canViewMode(mode) {
		if (Object.values(FU.tokenDisplayModes).includes(mode)) {
			const adversary = FUPartySheet.getActiveModel()?.getAdversary(`Actor.${this.actor.id}`);
			if (!adversary) return false;

			// Ensure at least basic study results, since that is what gets max HP and MP
			// But always show for token owner
			const difficulties = StudyRollHandler.getStudyDifficulties();
			const isStudied = adversary.study >= difficulties[0];

			switch (mode) {
				case FU.tokenDisplayModes.STUDIEDALWAYS: {
					return this.isOwner || isStudied;
				}
				case FU.tokenDisplayModes.STUDIEDHOVER: {
					return this.hover && (this.isOwner || isStudied);
				}
			}
		} else {
			return super._canViewMode(mode);
		}
	}

	/** @inheritdoc */
	_refreshState() {
		super._refreshState();

		const isSecret = this.document.isSecret;
		const displayValues = Object.values(FU.tokenDisplayModes);

		const nameDisplayMode = this._getActualDisplayMode('displayName');
		if (displayValues.includes(nameDisplayMode)) {
			this.nameplate.visible = !isSecret && this._canViewMode(nameDisplayMode);
		}

		const barDisplayMode = this._getActualDisplayMode('displayBars');
		if (displayValues.includes(barDisplayMode)) {
			this.bars.visible = !isSecret && this.actor && this._canViewMode(barDisplayMode);
		}
	}

	/** @inheritdoc */
	drawBars() {
		const displayMode = this._getActualDisplayMode('displayBars');
		if (!Object.values(FU.tokenDisplayModes).includes(displayMode)) return super.drawBars();

		['bar1', 'bar2'].forEach((key, index) => {
			const bar = this.bars[key];
			const data = this.document[key];
			if (!data.max) return (bar.visible = false);
			this._drawBar(index, bar, data);
			bar.visible = true;
		});
	}

	constructor(...args) {
		super(...args);
		this._createPressureGauge();
	}
}

Hooks.on('updateActor', (actor) => {
	if (actor.system instanceof PartyDataModel) {
		const adversaryIds = actor.system.adversaries.map((adversary) => adversary.uuid);

		canvas.tokens.placeables.forEach((token) => {
			if (adversaryIds.includes(`Actor.${token.actor?.id}`)) token._refreshState();
		});
	}
});
