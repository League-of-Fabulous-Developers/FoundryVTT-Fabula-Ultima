import { SYSTEM } from '../helpers/config.mjs';
import { KEYBINDINGS } from '../keybindings.mjs';
import { SETTINGS } from '../settings.js';

export class FUTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
	static instances = [];

	static get shouldDraw() {
		if (game.settings.get(SYSTEM, SETTINGS.optionEnableDragRuler)) return true;

		const binding = game.keybindings.get(SYSTEM, KEYBINDINGS.showTokenDragRuler);
		if (binding?.some(({ key }) => game.keyboard.downKeys.has(key))) return true;

		return false;
	}

	#previousRefreshData = undefined;

	static toggleVisibility() {
		const shouldDraw = FUTokenRuler.shouldDraw;
		FUTokenRuler.instances.forEach((instance) => {
			instance.visible = shouldDraw;
			if (shouldDraw) instance.refresh(instance.#previousRefreshData);
		});
	}

	refresh({ passedWaypoints, pendingWaypoints, plannedMovement }) {
		this.#previousRefreshData = { passedWaypoints, pendingWaypoints, plannedMovement };
		if (FUTokenRuler.shouldDraw) return super.refresh({ passedWaypoints, pendingWaypoints, plannedMovement });
		else return super.refresh({ passedWaypoints: [], pendingWaypoints: [], plannedMovement: [] });
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
