import { FLAG_ACTIVE_WELLSPRINGS, WellspringDataModel, WELLSPRINGS } from './invoker-integration.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { FUHooks } from '../../../../hooks.mjs';
import { SETTINGS } from '../../../../settings.js';

export class GameWellspringManager extends Application {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['form', 'projectfu', 'wellspring-manager-app'],
			width: 350,
			height: 'auto',
			closeOnSubmit: false,
			editable: true,
			sheetConfig: false,
			submitOnChange: true,
			submitOnClose: true,
			minimizable: false,
			title: 'FU.ClassFeatureInvocationsWellspringManagerTitle',
		});
	}

	constructor() {
		super();

		Hooks.on(FUHooks.HOOK_WELLSPRING_CHANGED, () => this.render());
		Hooks.on('canvasReady', () => this.render());
	}

	get template() {
		return 'systems/projectfu/templates/feature/invoker/wellspring-manager-application.hbs';
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
	 * @param {MouseEvent} event
	 */
	async toggleWellspring(event) {
		const context = event.currentTarget.closest('[data-context]').dataset.context;
		const element = event.currentTarget.dataset.wellspring;

		const wellsprings = this.getWellsprings(context);

		wellsprings.updateSource({ [element]: !wellsprings[element] });

		await this.setWellsprings(context, wellsprings);

		this.render();
	}

	/**
	 * @param {MouseEvent} event
	 */
	clearWellsprings(event) {
		if (!event.shiftKey) return;

		const context = event.currentTarget.closest('[data-context]').dataset.context;

		({
			global: () => game.settings.set(SYSTEM, SETTINGS.activeWellsprings, new WellspringDataModel()),
			active: () => GameWellspringManager.activeScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, new WellspringDataModel()),
			current: () => GameWellspringManager.currentScene?.setFlag(SYSTEM, FLAG_ACTIVE_WELLSPRINGS, new WellspringDataModel()),
		})[context]();

		this.render();
	}

	activateListeners(html) {
		super.activateListeners(html);

		html.find('a[data-action=toggleWellspring][data-wellspring]').click(this.toggleWellspring.bind(this));
		html.find('a[data-action=clearWellsprings]').click(this.clearWellsprings.bind(this));
	}

	getData(options = {}) {
		return {
			global: GameWellspringManager.globalActiveWellsprings,
			active: {
				scene: GameWellspringManager.activeScene?.name,
				wellsprings: GameWellspringManager.activeSceneActiveWellsprings,
			},
			current: {
				scene: GameWellspringManager.currentScene?.name,
				wellsprings: GameWellspringManager.currentSceneActiveWellsprings,
			},
			wellsprings: WELLSPRINGS,
		};
	}
}
