import { SYSTEM } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUHooks } from '../../hooks.mjs';
import { SETTINGS } from '../../settings.js';

const DEFAULT_THEME_KEY = 'fu-default';

/** @type {import('./typedefs.mjs').CombatHUDTheme} */
const knownClasses = {};
let _currentInstance = undefined;

Object.defineProperty(ui, 'combatHud', {
	get() {
		return BaseCombatHUD.instance;
	},
	enumerable: true,
	configurable: true,
});

export class BaseCombatHUD extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: 'combat-hud',
		classes: [...super.DEFAULT_OPTIONS.classes, 'projectfu', 'projectfu-combat-hud'],
		form: {
			closeOnSubmit: false,
		},
		window: {
			frame: false,
			positioned: false,
		},
		actions: {},
	};

	static PARTS = {
		header: {
			template: systemTemplatePath('ui/combat-hud/combat-hud-header'),
			templates: [],
		},
	};

	/** @type {boolean} */
	static get shouldBeVisible() {
		if (!game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud) || game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) return false;
		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudAlwaysShow)) return true;
		if (game.combat?.isActive) return true;
		return false;
	}

	/**
	 * @type {import('./typedefs.mjs').CombatHUDTheme}
	 */
	static get classes() {
		return knownClasses;
	}

	/** @type {BaseCombatHUD} */
	static get instance() {
		return _currentInstance;
	}
	static set instance(val) {
		if (_currentInstance) _currentInstance.destroy();
		_currentInstance = val;
	}

	/** The class for the currently active theme */
	static get implementation() {
		const theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme) ?? DEFAULT_THEME_KEY;
		return BaseCombatHUD.classes[theme]?.cls ?? BaseCombatHUD.classes[DEFAULT_THEME_KEY]?.cls;
	}

	static async update() {
		if (BaseCombatHUD.shouldBeVisible && BaseCombatHUD.instance) {
			await BaseCombatHUD.instance.render({ force: true });
		} else {
			await BaseCombatHUD.instance.close({ animate: false });
		}
	}

	/**
	 *
	 * @param {import('./typedefs.mjs').CombatHUDTheme} theme
	 */
	static RegisterCombatHUDClass(theme) {
		this.classes[theme.id] = theme;
	}

	/** Returns whether or not this particular class is active */
	static get active() {
		return false;
	}

	/** Handles any sort of clean up that may be needed */
	destroy() {}

	/**
	 * Initializes the combat HUD
	 */
	static async init() {
		if (!BaseCombatHUD.implementation) throw new Error('No combat HUD theme configured');

		if (BaseCombatHUD.instance && !(BaseCombatHUD.instance instanceof BaseCombatHUD.implementation)) {
			this.instance.destroy();
			BaseCombatHUD.instance = undefined;
		}
		BaseCombatHUD.instance ??= new BaseCombatHUD.implementation();
		Hooks.callAll(FUHooks.COMBAT_HUD.INIT, BaseCombatHUD.instance);
		BaseCombatHUD.instance.init();
		Hooks.callAll(FUHooks.COMBAT_HUD.READY, BaseCombatHUD.instance);
	}

	init() {
		Hooks.callAll();
		if (this.shouldBeVisible) this.render({ force: true });
		console.log('Combat HUD: Initialized');
	}

	async _onRender(context, options) {
		await super._onRender(context, options);

		this.element.css;
		this._setSizeAndPosition();

		Hooks.callAll(FUHooks.COMBAT_HUD.render, this, context, options);
	}

	// lerp(a, b, alpha) {
	// 	return a + alpha * (b - a);
	// }

	_setSizeAndPosition() {
		// TODO: Handle popping out (both PopOut! module and v14 native method)
	}

	/**
	 * @returns {import('./typedefs.mjs').WindowPosition}
	 */
	_calculateWindowPosition() {
		return {
			left: 0,
			top: 0,
			width: window.innerWidth,
		};
	}

	get _elementClass() {
		return '';
	}

	async _prepareContext(options = {}) {
		/** @type {import('./typedefs.mjs').CombatHUDRenderContext} */
		const context = await super._prepareContext(options);
		context.elementClass = this._elementClass;
		// Only show the pop-out button if the PopOut! module is active, or we're in Foundry v14 or newer
		context.showPopoutButton = game.modules.get('popout')?.active || game.release.isNewer('14');
		return context;
	}

	constructor(options) {
		if (new.target === BaseCombatHUD) throw new Error('Attempting to instantiate BaseCombatHUD directly');
		super(options);

		// The actual rendering process can be a little un-performant, so we add a debounce timer
		// to prevent it from being called too often.
		this.render = foundry.utils.debounce(this.render, 250);
	}
}
