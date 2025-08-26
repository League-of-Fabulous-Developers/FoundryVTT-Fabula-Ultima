import { SYSTEM } from '../helpers/config.mjs';
import { FUKeybindings } from '../keybindings.mjs';
import { SETTINGS } from '../settings.js';

export class FUTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
	static instances = [];

	static get shouldDraw() {
		if (canvas.scene.grid.type === 0 && game.settings.get(SYSTEM, SETTINGS.optionEnableDragRulerGridless)) return true;
		else if (canvas.scene.grid.type !== 0 && game.settings.get(SYSTEM, SETTINGS.optionEnableDragRulerGridded)) return true;

		const binding = game.keybindings.get(SYSTEM, FUKeybindings.showTokenDragRuler);
		if (binding?.some(({ key }) => game.keyboard.downKeys.has(key))) return true;

		return false;
	}

	#previousRefreshData = undefined;

	refresh(data) {
		this.#previousRefreshData = foundry.utils.deepClone(data);
		super.refresh(data);
	}

	static toggleVisibility() {
		FUTokenRuler.instances.forEach((instance) => {
			instance.refresh(instance.#previousRefreshData);
		});
	}

	_getWaypointLabelContext(waypoint, state) {
		if (!FUTokenRuler.shouldDraw) return undefined;
		else return super._getWaypointLabelContext(waypoint, state);
	}

	_getWaypointStyle(waypoint) {
		const style = super._getWaypointStyle(waypoint);
		if (!FUTokenRuler.shouldDraw) style.alpha = 0;
		return style;
	}

	_getGridHighlightStyle(waypoint, offset) {
		const style = super._getGridHighlightStyle(waypoint, offset);
		if (!FUTokenRuler.shouldDraw) style.alpha = 0;
		return style;
	}

	_getSegmentStyle(waypoint) {
		const style = super._getSegmentStyle(waypoint);
		if (!FUTokenRuler.shouldDraw) style.alpha = 0;
		return style;
	}

	destroy(...args) {
		const index = FUTokenRuler.instances.indexOf(this);
		if (index !== -1) FUTokenRuler.instances.splice(index, 1);

		return super.destroy(...args);
	}

	constructor(token, ...args) {
		super(token, ...args);
		FUTokenRuler.instances.push(this);
	}
}
