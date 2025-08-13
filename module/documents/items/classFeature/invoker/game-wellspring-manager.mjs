import { FLAG_ACTIVE_WELLSPRINGS, WellspringDataModel, WELLSPRINGS } from './invoker-integration.mjs';
import { SYSTEM, systemPath } from '../../../../helpers/config.mjs';
import { FUHooks } from '../../../../hooks.mjs';
import { SETTINGS } from '../../../../settings.js';
import FUApplication from '../../../../ui/application.mjs';

export class GameWellspringManager extends FUApplication {
	/**
	 * @inheritDoc
	 * @override
	 * @type ApplicationConfiguration
	 */
	static DEFAULT_OPTIONS = {
		classes: ['form', 'wellspring-manager-app'],
		position: { width: 350, height: 'auto' },
		actions: {
			toggleWellspring: this.#toggleWellspring,
			clearWellsprings: this.#clearWellsprings,
		},
		window: {
			title: 'FU.ClassFeatureInvocationsWellspringManagerTitle',
			resizable: true,
			minimizable: false,
		},
	};

	/**
	 * @override
	 */
	static PARTS = {
		form: {
			template: systemPath('templates/feature/invoker/wellspring-manager-application.hbs'),
		},
	};

	constructor() {
		super();

		Hooks.on(FUHooks.HOOK_WELLSPRING_CHANGED, () => this.render());
		Hooks.on('canvasReady', () => this.render());
	}

	/** @override */
	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		context.global = GameWellspringManager.globalActiveWellsprings;
		context.active = {
			scene: GameWellspringManager.activeScene?.name,
			wellsprings: GameWellspringManager.activeSceneActiveWellsprings,
		};
		context.current = {
			scene: GameWellspringManager.currentScene?.name,
			wellsprings: GameWellspringManager.currentSceneActiveWellsprings,
		};
		context.wellsprings = WELLSPRINGS;
		return context;
	}

	/**
	 * @return {WellspringDataModel}
	 */
	static get globalActiveWellsprings() {
		return game.settings.get(SYSTEM, SETTINGS.activeWellsprings);
	}

	static get activeScene() {
		return game.scenes.active;
	}

	/**
	 * @return {WellspringDataModel}
	 */
	static get activeSceneActiveWellsprings() {
		const flag = GameWellspringManager.activeScene?.getFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS);
		return new WellspringDataModel(flag);
	}

	static get currentScene() {
		return game.scenes.current;
	}

	/**
	 * @return {WellspringDataModel}
	 */
	static get currentSceneActiveWellsprings() {
		const flag = GameWellspringManager.currentScene?.getFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS);
		return new WellspringDataModel(flag);
	}

	getWellsprings(context) {
		const getter = {
			global: () => GameWellspringManager.globalActiveWellsprings,
			active: () => GameWellspringManager.activeSceneActiveWellsprings,
			current: () => GameWellspringManager.currentSceneActiveWellsprings,
		};
		return new WellspringDataModel(getter[context]());
	}

	async setWellsprings(context, wellsprings) {
		const setter = {
			global: (newWellsprings) => game.settings.set(SYSTEM, SETTINGS.activeWellsprings, newWellsprings),
			active: (newWellsprings) => GameWellspringManager.activeScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, newWellsprings),
			current: (newWellsprings) => GameWellspringManager.currentScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, newWellsprings),
		};
		return setter[context](new WellspringDataModel(wellsprings));
	}

	/**
	 * @this GameWellspringManager
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #toggleWellspring(event, target) {
		const context = target.closest('fieldset[data-context]').dataset.context;
		const element = target.dataset.wellspring;

		const wellsprings = this.getWellsprings(context);

		wellsprings.updateSource({ [element]: !wellsprings[element] });

		await this.setWellsprings(context, wellsprings);

		this.render();
	}

	/**
	 * @this GameWellspringManager
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static #clearWellsprings(event, target) {
		if (!event.shiftKey) return;

		const context = target.closest('fieldset[data-context]').dataset.context;

		({
			global: () => game.settings.set(SYSTEM, SETTINGS.activeWellsprings, new WellspringDataModel()),
			active: () => GameWellspringManager.activeScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, new WellspringDataModel()),
			current: () => GameWellspringManager.currentScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, new WellspringDataModel()),
		})[context]();

		this.render();
	}
}
