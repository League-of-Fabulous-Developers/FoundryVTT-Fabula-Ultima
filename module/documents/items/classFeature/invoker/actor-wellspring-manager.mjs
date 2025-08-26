import { GameWellspringManager } from './game-wellspring-manager.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { FUHooks } from '../../../../hooks.mjs';

const FLAG_INNER_WELLSPRING = 'innerWellspring';

export class ActorWellspringManager {
	#actor;

	constructor(actor) {
		this.#actor = actor;

		Hooks.on(FUHooks.HOOK_WELLSPRING_CHANGED, () => {
			if (this.#actor.sheet.rendered) this.#actor.sheet.render();
		});
		Hooks.on('canvasReady', () => {
			if (this.#actor.sheet.rendered) this.#actor.sheet.render();
		});
	}

	static onActorPrepared(actor) {
		if (actor.type === 'character') {
			actor.wellspringManager ??= new ActorWellspringManager(actor);
		}
	}

	get activeWellsprings() {
		let activeWellsprings = GameWellspringManager.currentSceneActiveWellsprings;
		if (!activeWellsprings.isActive()) {
			activeWellsprings = GameWellspringManager.activeSceneActiveWellsprings;
		}
		if (!activeWellsprings.isActive()) {
			activeWellsprings = GameWellspringManager.globalActiveWellsprings;
		}

		const innerWellspring = this.#actor.getFlag(SYSTEM, FLAG_INNER_WELLSPRING);
		if (innerWellspring) {
			activeWellsprings[innerWellspring] = true;
		}

		return activeWellsprings;
	}
}
