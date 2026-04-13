import { SYSTEM } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { SETTINGS } from '../../settings.js';

const DEFAULT_THEME_KEY = 'fu-default';

/**
 * @typedef {Object} CombatHUDTheme
 * @property {string} id
 * @property {string} name
 * @property {typeof BaseCombatHUD} cls
 */

/** @type {CombatHUDTheme} */
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
		classes: [...super.DEFAULT_OPTIONS.classes, 'projectfu'],
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

	/**
	 * @type {CombatHUDTheme}
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

	static update() {}

	/**
	 *
	 * @param {CombatHUDTheme} theme
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
		}
		BaseCombatHUD.instance ??= new BaseCombatHUD.implementation();
		BaseCombatHUD.instance = undefined;
		BaseCombatHUD.instance.init();
	}

	init() {}

	constructor(options) {
		if (new.target === BaseCombatHUD) throw new Error('Attempting to instantiate BaseCombatHUD directly');
		super(options);
	}
}
