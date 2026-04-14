import { FU, SYSTEM } from '../../helpers/config.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUHooks } from '../../hooks.mjs';
import { SETTINGS } from '../../settings.js';
import { FUCombat } from '../combat.mjs';

const DEFAULT_THEME_KEY = 'fu-default';

/**
 * enum flag used to determine how the combat HUD is docked
 */
export const HUDDockPositions = Object.freeze({
	NONE: 0,
	TOP: 1 << 0,
	BOTTOM: 1 << 1,
	LEFT: 1 << 2,
	RIGHT: 1 << 3,
});

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

	get minWidth() {
		return 700;
	}

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
	destroy() {
		this.close();
	}

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
		const pos = this._calculateWindowPosition();

		this.element.style.width = `${pos.width}px`;

		if (pos.top) this.element.style.top = `${pos.top}px`;
		if (pos.bottom) this.element.style.bottom = `${pos.bottom}px`;
		if (pos.left) this.element.style.left = `${pos.left}px`;
		if (pos.right) this.element.style.right = `${pos.right}px`;

		// TODO: Clamp movement to within the visible screen area

		this._applyButtonPosition();
	}

	/** Handles positioning the control buttons at the top or bottom */
	_applyButtonPosition() {
		const positionButtonFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPositionButton) === 'top';
		const topClass = `${this._elementClass}__window-button--top`;
		const bottomClass = `${this._elementClass}__window-button--bottom`;

		const buttons = this.element.querySelectorAll(`${this._elementClass}__window-button`);
		for (const button of buttons) {
			if (positionButtonFromTop) {
				button.classList.add(topClass);
				button.classList.remove(bottomClass);
			} else {
				button.classList.add(bottomClass);
				button.classList.remove(topClass);
			}
		}
	}

	/**
	 * Determines the path to the template partial to use to display a given resource
	 * @param {string} resource
	 * @returns {string}
	 */
	_getResourcePartial(resource) {
		if (resource === 'none') return null;

		let theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme).replace('fu-', '');
		if (theme === 'default') theme = '';
		else theme = '-' + theme;

		const basePath = 'systems/projectfu/templates/ui/partials/combat-bar-';
		return basePath + resource + theme + '.hbs';
	}

	/**
	 * Retrieve a source image for a combatant.
	 * Modified from CombatTracker._getCombatantThumbnail()
	 * @param {Combatant} combatant         The combatant queried for image.
	 * @returns {Promise<string>}           The source image attributed for this combatant.
	 * @protected
	 */
	async _getCombatantThumbnail(combatant) {
		if (combatant._videoSrc && !combatant.img) {
			if (combatant._thumb) return combatant._thumb;
			return (combatant._thumb = await game.video.createThumbnail(combatant._videoSrc, {
				width: 200,
				height: 200,
			}));
		}

		return combatant.img ?? CONST.DEFAULT_TOKEN;
	}

	/**
	 * Prepares the context for a given combatant to be passed to our handlebars templates
	 * @param {import('../combatant.mjs').Combatant} combatant
	 * @returns {Promise<import('./typedefs.mjs').CombatHUDCombatantContext | undefined>} - {@link CombatHUDCombatantContext}
	 */
	async _prepareCombatantContext(combatant) {
		if (!combatant.token || !combatant.actor || combatant.hidden) return;
		const activeEffects = game.release.generation >= 11 ? Array.from(combatant.actor.temporaryEffects) : combatant.actor.effects.filter((e) => e.isTemporary).filter((e) => !e.disabled && !e.isSuppressed);

		const zeroPower = Object.values(combatant.actor.tracks).find((track) => track.parent?.item?.system?.optionalType === FU.optionalFeatures.zeroPower);

		const trackedResourcePart1 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource1));
		const trackedResourcePart2 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource2));
		const trackedResourcePart3 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource3));
		const trackedResourcePart4 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource4));

		/** @type {import('./typedefs.mjs').CombatHUDCombatantContext} */
		const actorData = {
			id: combatant.id,
			name: combatant.name,
			actor: combatant.actor,
			isOwner: combatant.isOwner,
			totalTurns: combatant.totalTurns,
			token: combatant.token,
			faction: combatant.faction,
			disposition: combatant.token.disposition,
			effects: activeEffects,
			hasEffects: activeEffects.length > 0 && game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowEffects),
			img: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPortrait) === 'token' ? await this._getCombatantThumbnail(combatant) : combatant.actor.img,
			trackedResourcePart1,
			trackedResourcePart2,
			trackedResourcePart3,
			trackedResourcePart4,
			hideTurns: !FUCombat.showTurnsFor(combatant),
			order: 0,
			opacity: (game.settings.get(SYSTEM, SETTINGS.optionCombatHudOpacity) ?? 100) / 100,
			zeropower: zeroPower?.system?.data ?? {
				current: 0,
				max: 0,
			},
		};

		const barCount = [trackedResourcePart1, trackedResourcePart2, trackedResourcePart3, trackedResourcePart4].filter((item) => !!item).length;

		switch (barCount) {
			case 1:
				actorData.rowClass = 'one-bar';
				break;
			case 2:
				actorData.rowClass = 'two-bars';
				break;
			case 3:
			case 4:
				// TODO: Should this actually separate between three-bars and four-bars?
				actorData.rowClass = 'three-bars';
				break;
			default:
				actorData.rowClass = 'no-bars';
		}

		if (actorData.hasEffects) {
			const maxEffectsBeforeMarquee = 5;
			const effectsMarqueeDuration = game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration);
			actorData.shouldEffectsMarquee = actorData.effects.length > maxEffectsBeforeMarquee && effectsMarqueeDuration < 9000;
			actorData.effectsMarqueeDuration = effectsMarqueeDuration;

			actorData.marqueeDirection = game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode);
		}

		return actorData;
	}

	/**
	 * @returns {import('./typedefs.mjs').WindowPosition}
	 */
	_calculateWindowPosition() {
		const hOffset = -5;
		const [uiLeft, uiMiddle, uiRight, uiBottom] = ['#ui-left', '#ui-middle', '#ui-right', '#hotbar'].map((selector) => document.querySelector(selector));

		// let hudWidth = uiMiddle.clientWidth * uiLeft.clientWidth * .5;
		// if (hudWidth < this.minWidth) hudWidth = this.minWidth;

		const hudWidth = Math.max(uiMiddle.clientWidth + uiLeft.clientWidth * 0.5 - (uiRight?.clientWidth ?? 0), this.minWidth);

		const draggedPosition = game.settings.get(SYSTEM, SETTINGS.optionCombatHudDraggedPosition);
		const positionFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition) === 'top';

		const position = {
			left: draggedPosition?.x ?? uiMiddle.getBoundingClientRect().left,
			top: 0,
			bottom: 0,
			right: 0,
			width: hudWidth + hOffset,
		};

		if (positionFromTop) {
			position.top = draggedPosition?.y ?? 48;
		} else {
			position.bottom = draggedPosition?.y ?? uiBottom.getBoundingClientRect().top;
		}

		return position;
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

		const combat = game.combat;
		combat.populateData(context);

		context.combatants = [];
		context.characters = [];
		context.npcs = [];

		const ordering = game.settings.get(SYSTEM, SETTINGS.optionCombatHudActorOrdering);

		for (const combatant of combat.combatants) {
			const combatantContext = await this._prepareCombatantContext(combatant);
			if (!combatantContext) continue;

			context.combatants.push(combatantContext);

			// TODO: Handle other dispositions?
			switch (combatant.token.disposition) {
				case foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY:
					context.characters.push(combatantContext);
					break;
				default:
					context.npcs.push(combatantContext);
			}

			let order = 0;
			const prevOrder = ordering.find((o) => o.tokenId === combatant.token.id);
			if (prevOrder) {
				order = prevOrder.order;
			} else {
				if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudOrderByInitiative)) {
					// Kind of hacky but handles getting actors in descending order based on initiative score,
					// TODO: Ensure it properly handles actors being added after manual ordering
					order = 100 - (combatant.actor?.system?.derived?.init?.value ?? 0);
				} else {
					if (combatant.token.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) order = context.characters.length + 1;
					else order = context.npcs.length + 1;
				}

				ordering.push({
					tokenId: combatant.token.id,
					order,
				});
			}
			combatantContext.order = order;
		}

		context.characters.sort((a, b) => a.order - b.order);
		context.npcs.sort((a, b) => a.order - b.order);
		context.combatants.sort((a, b) => a.order - b.order);

		console.log('Combat HUD: Context:', context);
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
