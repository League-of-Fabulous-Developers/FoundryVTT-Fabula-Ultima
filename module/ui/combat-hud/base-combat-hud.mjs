import { FU, SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUHooks } from '../../hooks.mjs';
import { StudyRollHandler } from '../../pipelines/study-roll.mjs';
import { SETTINGS } from '../../settings.js';
import { FUCombat } from '../combat.mjs';
import { NpcProfileWindow } from '../npc-profile.mjs';

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
		actions: {
			StartTurn: BaseCombatHUD.StartTurn,
			EndTurn: BaseCombatHUD.EndTurn,
			clickCombatant: BaseCombatHUD.ClickCombatant,
			refreshHud: BaseCombatHUD.RefreshHUD,
		},
	};

	static PARTS = {
		header: {
			template: systemTemplatePath('ui/combat-hud/combat-hud-header'),
			templates: [],
		},
	};

	/** @this {BaseCombatHUD} */
	static StartTurn() {
		console.log('StartTurn action');
	}

	/** @this {BaseCombatHUD} */
	static EndTurn() {
		console.log('EndTurn action');
	}

	/**
	 *
	 * @param {PointerEvent} e
	 * @param {HTMLElement} elem
	 * @this {BaseCombatHUD}
	 */
	static ClickCombatant(e, elem) {
		const combatant = this.combat.combatants.get(elem.dataset.combatantId);
		e.preventDefault();
		this._onClickCombatant(combatant);
	}

	/** @this {BaseCombatHUD} */
	static async RefreshHUD() {
		await this.render();
	}

	get minWidth() {
		return 700;
	}

	_onStartTurn(combatant) {
		if (combatant) return ui.combat.handleStartTurn(combatant);
	}

	_onEndTurn(combatant) {
		if (combatant) return ui.combat.handleEndTurn(combatant);
	}

	_clickTimeout = undefined;
	_onClickCombatant(combatant) {
		if (this._clickTimeout) {
			this._onDoubleClickCombatant(combatant);
			clearTimeout(this._clickTimeout);
			this._clickTimeout = undefined;
			return;
		}

		this._clickTimeout = setTimeout(() => {
			if (!combatant.actor.testUserPermission(game.user, 'OBSERVER')) return;
			console.log('Click');
			const isShiftActive = game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT);
			combatant.token.object.control({ releaseOthers: !isShiftActive });
		}, 250);
	}

	_onDoubleClickCombatant(combatant) {
		console.log('Double click');
		if (!combatant.actor.testUserPermission(game.user, 'OBSERVER') && !game.user.isGM) return;
		combatant.actor.sheet.render(true);
	}

	/** @type {boolean} */
	static get shouldBeVisible() {
		if (!game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud) || game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) return false;
		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudAlwaysShow)) return true;
		if (BaseCombatHUD.combat?.isActive) return true;
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
		} else if (BaseCombatHUD.instance) {
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

	static get combat() {
		return game.combat;
	}

	get combat() {
		return BaseCombatHUD.combat;
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
	// TODO: Implement override settings?
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

	/** @type {Record<string, Function>} */
	_resourcePartialRenderFuncs = {};

	/**
	 * Convenience function to add an event listener ot a set of HTML elements
	 * @param {string} selector
	 * @param {string} event
	 * @param {Function} listener
	 */
	_addEventListener(selector, event, listener) {
		const elements = Array.from(this.element.querySelectorAll(selector));
		for (const element of elements) {
			if (element instanceof HTMLElement) element.addEventListener(event, listener.bind(this));
		}
	}

	_enemyCombatantMouseEnter(e) {
		e.preventDefault();
		if (!canvas.ready) return;

		const token = canvas.tokens.get(e.target.dataset.tokenId);
		if (token?.isVisible) token._onHoverIn(e, { hoverOutOthers: true });
	}

	_enemyCombatantMouseLeave(e) {
		e.preventDefault();
		if (!canvas.ready) return;

		const token = canvas.tokens.get(e.target.dataset.tokenId);
		if (token?.isVisible) token._onHoverOut(e);
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		await this._loadBarPartials();
	}

	/**
	 *
	 * @param {FUCombatant} combatant
	 * @returns {boolean}
	 */
	_canStartTurn(combatant) {
		const turnsLeft = this.combat.countTurnsLeft();
		return this.combat.started && turnsLeft[combatant.id] > 0;
	}

	_canEndTurn(combatant) {}

	/**
	 *
	 * @param {*} combatant
	 * @param {*} menuItems
	 * @returns {ContextMenuEntry[]}
	 */
	_getCombatantContextMenuItems(combatant, context, menuItems) {
		// TODO: These properties change in v14
		// name = label
		// condition = visible
		// callback = onClick

		menuItems.push(
			{
				name: 'FU.COMBATHUD.CONTEXT.StartTurn',
				icon: `<i class="mats-o mats-fill">counter_${Math.max(context.turnsLeft[combatant.id], 0)}</i>`,
				condition: () => game.combat.started && this.combat.current?.combatantId !== combatant.id && context.turnsLeft[combatant.id] > 0,
				callback: () => this._onStartTurn(combatant),
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.StartTurnOutOfOrder',
				icon: `<i class="mats-o">counter_${Math.max(context.turnsLeft[combatant.id], 0)}</i>`,
				condition: () => true,
				callback: () => {},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.EndTurn',
				icon: `<i class="mats-o mats-fill">${context.icons.active}</i>`,
				condition: () => game.combat.started && this.combat.current?.combatantId === combatant.id,
				callback: () => this._onEndTurn(combatant),
			},
			{
				name: 'FU.CombatHudTurnIconsOutOfTurns',
				icon: `<i class="mats-o">${context.icons.outOfTurns}</i>`,
				classes: 'projectfu-combat-hud--disabled disabled',
				condition: () => game.combat.started && context.turnsLeft[combatant.id] <= 0,
				callback: () => {
					/* This space intentionally left blank */
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.ViewActorSheet',
				icon: `<i class="mats-o mats-fill">person</i>`,
				condition: () => combatant.isOwner,
				callback: () => {
					combatant.actor.sheet.render({ force: true });
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.SelectActor',
				icon: `<i class="mats-o mats-fill">select</i>`,
				condition: () => combatant.isOwner,
				callback: () => {
					combatant.token.object.control();
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.ViewAdversary',
				icon: `<i class="mats-o mats-fill">swords</i>`,
				condition: () => combatant.isNPC && !!game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty))?.system.getAdversary(combatant.actor.uuid),
				callback: () => {
					const party = game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty));
					if (!party) return;
					party.sheet.revealNpc(combatant.actor.uuid);
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.EditAdversary',
				icon: `<i class="mats-o mats-fill">edit</i>`,
				condition: () => combatant.isNPC && combatant.isOwner && !!game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty))?.system.getAdversary(combatant.actor.uuid),
				callback: () => {
					const party = game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty));
					if (!party) return;
					return NpcProfileWindow.updateNpcProfile(party.system, combatant.actor.uuid, true);
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.AddAdversary',
				icon: `<i class="mats-o mats-fill">add</i>`,
				condition: () => combatant.isNPC && !game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty))?.system.getAdversary(combatant.actor.uuid),
				callback: () => {
					const party = game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty));
					if (!party) return;
					party.system.addOrUpdateAdversary(combatant.actor, 0);
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.UnhideToken',
				icon: `<i class="mats-o mats-fill">visibility</i>`,
				condition: () => this.combat.isOwner && combatant.token.hidden,
				callback: () => {
					foundry.ui.combat._onToggleHidden(combatant);
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.HideToken',
				icon: '<i class="mats-o mats-fill" data-action="toggleHidden">visibility_off</i>',
				condition: () => this.combat.isOwner && !combatant.token.hidden,
				callback: () => {
					foundry.ui.combat._onToggleHidden(combatant);
				},
			},
			{
				name: 'FU.COMBATHUD.CONTEXT.RemoveCombatant',
				icon: `<i class="mats-o mats-fill">delete</i>`,
				condition: () => this.combat.isOwner,
				callback: async () => {
					await combatant.delete();
				},
			},
		);
		return menuItems;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);

		this._setSizeAndPosition();

		this._addEventListener(`[data-role="combatant-portrait"]`, 'mouseenter', this._enemyCombatantMouseEnter);
		this._addEventListener(`[data-role="combatant-portrait"]`, 'mouseleave', this._enemyCombatantMouseLeave);

		const elements = Array.from(this.element.querySelectorAll(`[data-role="combatant-portrait"]`));
		for (const element of elements) {
			if (element instanceof HTMLElement) {
				const combatant = BaseCombatHUD.combat.combatants.find((combatant) => combatant.token.id === element.dataset.tokenId);
				const menuItems = [];
				this._getCombatantContextMenuItems(combatant, context, menuItems);
				new foundry.applications.ux.ContextMenu.implementation(this.element, `[data-role="combatant-portrait"][data-token-id="${element.dataset.tokenId}"]`, menuItems, { jQuery: false, fixed: true });
			}
		}

		Hooks.callAll(FUHooks.COMBAT_HUD.render, this, context, options);
	}

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

		return systemTemplatePath(`ui/combat-hud/${theme}/combat-hud-${theme}-bar-${resource}`);
	}

	_getResourcePath(resource) {
		if (resource === 'none') return '';
		if (resource === 'zeropower' || resource.startsWith('tracks.')) return resource;

		return `system.resources.${resource}`;
	}

	_getResourceLabel(combatant, resource) {
		if (FU.combatHudResources[resource]) return FU.combatHudResources[resource];

		const model = foundry.utils.getProperty(combatant.actor, resource);

		if (model) {
			if (model.name) return model.name;
			if (model.parent.name) return model.parent.name;
			if (model.parent.parent?.name) return model.parent.parent.name;
		}

		return resource;
	}

	_getResourceClass(combatant, resource) {
		let resourceClass = `bar-${resource}`;

		if (resource === 'hp' && combatant.actor.system.resources.hp.inCrisis) resourceClass += ' bar-hp-crisis';

		return resourceClass;
	}

	_getResourceIcon(combatant, resource) {
		switch (resource) {
			case 'hp':
				return 'fa-solid fa-heart';
			case 'mp':
				return 'fa-solid fa-hat-wizard icon';
			case 'fp':
				return 'fa-solid fa-feather';
			case 'exp':
				return 'fa-solid fa-feather-pointed icon';
			case 'zenit':
				return 'fuk fu-zenit icon-aff';
			case 'zeropower':
				return 'ra ra-aura';
		}
		return '';
	}

	_getResourceImage(combatant, resource) {
		if (resource.startsWith('tracks.')) {
			const track = foundry.utils.getProperty(combatant.actor, resource);
			if (track.parent.img) return track.parent.img;
			if (track.parent.parent?.img) return track.parent.parent.img;
		}
		return '';
	}

	_getResourceBackgroundStyle(combatant, resource) {
		switch (resource) {
			case 'tracks.pressure':
			case 'clocks.pressure':
				return 'background:var(--background-critical)';
			case 'tracks.garden':
			case 'clocks.garden':
				return 'background-image:linear-gradient(90deg, #c60478, rgba(255, 255, 255, 0.5));background-color:red;';
			case 'tracks.brainwave-clock':
			case 'clocks.brainwave-clock':
				return 'background-image:linear-gradient(90deg, #3b1e3f, rgba(255, 255, 255, 0.5));background-color:#1d0920';
			// Grave points are handled a bit weird
			// These variations are an attempt at future-proofing
			case 'tracks.Beyond The Realms Of Death':
			case 'tracks.Grave Points':
			case 'tracks.beyond-the-realms-of-death':
			case 'tracks.grave-points':
				return 'background-image:linear-gradient(90deg, #6b6d7d, rgba(255, 255, 255, 0.5));background-color:#022124';
		}
	}

	/**
	 * Returns context for a given resource partial
	 * @param {string} resource
	 * @returns
	 */
	_getResourceContext(combatant, resource) {
		if (resource === 'none') return;
		const resourceValue = this._getCombatantResource(combatant, resource);

		return {
			path: this._getResourcePath(resource),
			label: this._getResourceLabel(combatant, resource),
			abbr: this._getResourceAbbreviation(resource),
			current: resourceValue?.current ?? 0,
			max: resourceValue?.max ?? 0,
			class: this._getResourceClass(combatant, resource),
			backgroundStyle: this._getResourceBackgroundStyle(combatant, resource),
			icon: this._getResourceIcon(combatant, resource),
			image: this._getResourceImage(combatant, resource),
			inCrisis: resource === 'hp' && combatant.actor.system.resources.hp.inCrisis,
			crisisScore: resource === 'hp' ? combatant.actor.system.resources.hp.crisisScore : 0,
		};
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

	_getCombatantTrackedResources(combatant) {
		// TODO: Actor overrides
		let actorType = '';
		if (combatant.actor.type === 'character') {
			actorType = 'PC';
		} else {
			// NPC
			actorType = 'NPC';
		}
		const resourceOverrides = combatant.actor.getFlag(Flags.Scope, Flags.Actor.combatHud.trackedResources) ?? [];
		return [
			resourceOverrides[0] && resourceOverrides[0] !== 'default' ? resourceOverrides[0] : game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTracked${actorType}Resource1`]),
			resourceOverrides[1] && resourceOverrides[1] !== 'default' ? resourceOverrides[1] : game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTracked${actorType}Resource2`]),
			resourceOverrides[2] && resourceOverrides[2] !== 'default' ? resourceOverrides[2] : game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTracked${actorType}Resource3`]),
			resourceOverrides[3] && resourceOverrides[3] !== 'default' ? resourceOverrides[3] : game.settings.get(SYSTEM, SETTINGS[`optionCombatHudTracked${actorType}Resource4`]),
		];
	}

	_shouldShowResources(combatant) {
		if (game.user.isGM) return true;
		if (combatant.actor.type === 'character') return true;
		if (combatant.token.disposition == CONFIG.TOKEN_DISPOSITIONS.FRIENDLY) return true;

		const showResourceMode = game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowNPCResourcesMode);
		if (showResourceMode === 'never') return false;
		if (showResourceMode === 'always') return true;

		const partyActor = game.actors.get(game.settings.get(SYSTEM, SETTINGS.activeParty));
		const adversaryEntry = partyActor?.system.getAdversary(combatant.actor.resolveUuid());
		if (adversaryEntry) {
			const studyResult = adversaryEntry ? StudyRollHandler.resolveStudyResult(adversaryEntry.study) : 'none';
			return studyResult !== 'none';
		}

		return false;
	}

	_getCombatantZeroPower(combatant) {
		return combatant.actor.items.find((item) => item.system.optionalType === FU.optionalFeatures.zeroPower);
	}

	_getResourceAbbreviation(combatant, resource) {
		if (FU.resourcesAbbr[resource]) return FU.resourcesAbbr[resource];
		if (resource === 'zeropower') return FU.optionalFeatures.zeroPower;
		return resource;
	}

	_getCombatantResource(combatant, resource) {
		const track = combatant.actor.resolveProgress(resource);
		if (track) {
			return {
				current: track.current,
				max: track.max,
			};
		}

		const res = combatant.actor.system.resources[resource];
		if (res) {
			return {
				current: res.value,
				max: res.max,
			};
		} else {
			const track = foundry.utils.getProperty(combatant.actor, resource);
			if (track) {
				return {
					current: track.current,
					max: track.max,
				};
			}
		}

		// Special case time!
		if (resource === 'zeropower') {
			const zeroPower = this._getCombatantZeroPower(combatant);
			if (zeroPower) {
				return {
					current: zeroPower.data.progress?.current ?? 0,
					max: zeroPower.data.progress?.max ?? 0,
				};
			}
		}

		return undefined;
	}

	_getCombatantTooltip(combatant, context) {
		const lines = [`<h4>${combatant.name}</h4>`, `<hr>`];

		if (context.showResources) {
			const resources = ['hp', 'mp', ...this._getCombatantTrackedResources(combatant)].filter((res, i, arr) => arr.indexOf(res) === i);
			for (const resource of resources) {
				if (resource !== 'none') {
					const resValue = this._getCombatantResource(combatant, resource);
					const key = resValue?.max ? 'FU.CombatHudResourceBarTooltip' : 'FU.CombatHudResourceScalarTooltip';

					const abbr = this._getResourceAbbreviation(combatant, resource);
					const label = abbr === resource ? this._getResourceLabel(combatant, resource) : abbr;

					lines.push(`<p>${game.i18n.format(key, { ...resValue, resource: game.i18n.localize(label) })}</p>`);
				}
			}
			if (resources.length) lines.push('<hr>');
		}

		if (combatant.actor.type === 'npc' && game.user.isGM) {
			lines.push(`<p>${game.i18n.localize('FU.CombatHudSelectCombatantTooltip')}</p>`);
		} else {
			lines.push(`<p>${game.i18n.localize('FU.CombatHudViewAdversaryTooltip')}</p>`);
		}

		if (combatant.actor.testUserPermission(game.user, 'OWNER')) lines.push(`<p>${game.i18n.localize('FU.CombatHudViewActorSheetTooltip')}</p>`);

		lines.push(`<p>${game.i18n.localize('FU.CombatHudContextMenuTooltip')}</p>`);
		return lines.join('\n');
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

		const trackedResources = this._getCombatantTrackedResources(combatant)
			.map((resource) => ({
				template: this._getResourcePartial(combatant, resource),
				context: this._getResourceContext(combatant, resource),
			}))
			.filter((context) => !!context.context);

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
			trackedResources,
			showPressureClock: false,
			hideTurns: !FUCombat.showTurnsFor(combatant),
			order: 0,
			tracks: (Object.values(combatant.actor.tracks) ?? []).map((track) => ({
				id: track.id,
				name: track.name,
				current: track.current,
				max: track.max,
				style: track.style,
				step: track.step,
			})),
			opacity: (game.settings.get(SYSTEM, SETTINGS.optionCombatHudOpacity) ?? 100) / 100,
			zeropower: zeroPower?.system?.data ?? {
				value: 0,
				max: 0,
			},
		};

		actorData.showResources = this._shouldShowResources(combatant);

		const barCount = actorData.trackedResources.length;

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

		if (game.settings.get(SYSTEM, SETTINGS.pressureSystem) && game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowPressureClock)) {
			const pressure = combatant.actor.resolveProgress('pressure');
			if (pressure) {
				actorData.showPressureClock = true;
				actorData.pressure = {
					current: pressure.current,
					max: pressure.max,
				};
			}
		}

		actorData.portraitTooltip = this._getCombatantTooltip(combatant, actorData);

		return actorData;
	}

	/**
	 * @returns {import('./typedefs.mjs').WindowPosition}
	 */
	_calculateWindowPosition() {
		const hOffset = -5;
		const [uiLeft, uiMiddle, uiRight, uiBottom] = ['#ui-left', '#ui-middle', '#ui-right-column-1', '#hotbar'].map((selector) => document.querySelector(selector));

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
		context.isCompact = false;
		context.mirrorFactionList = false;

		const combat = this.combat;
		combat.populateData(context);

		context.combatants = [];
		context.characters = [];
		context.npcs = [];
		context;

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

		console.log('Context:', context);
		return context;
	}

	/**
	 * Stores compiled versions of the resource partials, for insertion into combatant tooltips
	 */
	async _loadBarPartials() {
		const [barHp, barMp, barIp, barZeropower, barZenit, barFp, barXp] = await foundry.applications.handlebars.loadTemplates(['hp', 'mp', 'ip', 'zeropower', 'zenit', 'fp', 'exp'].map((res) => this._getResourcePartial(res)));
		this._resourcePartialRenderFuncs = {
			hp: barHp,
			mp: barMp,
			ip: barIp,
			zeropower: barZeropower,
			zenit: barZenit,
			fp: barFp,
			exp: barXp,
		};
	}

	constructor(options) {
		if (new.target === BaseCombatHUD) throw new Error('Attempting to instantiate BaseCombatHUD directly');
		super(options);

		// The actual rendering process can be a little un-performant, so we add a debounce timer
		// to prevent it from being called too often.
		this.render = foundry.utils.debounce(this.render, 250);
	}
}
