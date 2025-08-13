import { SETTINGS } from '../settings.js';
import { SYSTEM } from '../helpers/config.mjs';
import { FUHooks } from '../hooks.mjs';
import { FUCombat } from './combat.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { systemTemplatePath } from '../helpers/system-utils.mjs';

Hooks.once('setup', () => {
	/**
	 * @typedef HudButtonData
	 * @property {string} name
	 * @property {string} icon
	 * @property {boolean} [visible]
	 * @property {boolean} [toggle]
	 * @property {boolean} [active]
	 * @property {(event: Event, active: boolean) => void} [onClick]   A callback invoked when the tool is activated
	 * or deactivated
	 */

	/**
	 * @param {HTMLElement} containerElement
	 * @param {HudButtonData} buttonData
	 */
	function createButton(containerElement, buttonData) {
		const button = document.createElement('button');
		button.type = 'button';
		button.classList.add('control', 'ui-control');
		button.innerHTML = `<i class="${buttonData.icon}"></i>`;
		button.dataset.tooltip = game.i18n.localize(buttonData.name);

		if (buttonData.toggle) {
			let active = buttonData.active;
			button.classList.add('toggle');
			button.ariaPressed = active;
			button.addEventListener('click', (e) => {
				active = !active;
				button.ariaPressed = active;
				if (buttonData.onClick) {
					buttonData.onClick(e, active);
				}
			});
		} else {
			if (buttonData.onClick) {
				button.addEventListener('click', (e) => {
					buttonData.onClick(e, false);
				});
			}
		}

		containerElement.appendChild(button);
	}

	Hooks.on('renderCombatTracker', (app, element) => {
		if (game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud)) {
			const containerElement = document.createElement('div');
			containerElement.id = 'combat-hud-controls';
			createButton(containerElement, CombatHUD.getToggleControlButton());
			createButton(containerElement, CombatHUD.getSavedControlButton());
			createButton(containerElement, CombatHUD.getResetControlButton());

			const combatTrackerSection = element.querySelector('#combat-tracker').parentElement;
			combatTrackerSection.prepend(containerElement);
		}
	});
});

export class CombatHUD extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
	#hooks = [];

	static DEFAULT_OPTIONS = {
		id: 'combat-hud',
		classes: [...super.DEFAULT_OPTIONS.classes, 'projectfu'],
		form: { closeOnSubmit: false },
		window: {
			frame: false,
			positioned: false,
		},
		actions: {
			toggleCompact: CombatHUD.ToggleCompactMode,
			minimize: CombatHUD.MinimizeHUD,
			popout: CombatHUD.PopOutHUD,
			start: CombatHUD.StartCombat,
			stop: CombatHUD.StopCombat,
			startTurn: CombatHUD.StartTurn,
			endTurn: CombatHUD.EndTurn,
			takeTurnOutOfTurn: CombatHUD.TakeTurnOutOfTurn,
			clickCombatant: CombatHUD.ClickCombatant,
			clickEffect: CombatHUD.ClickEffect,
		},
	};

	static PARTS = {
		'fu-default': {
			template: systemTemplatePath('ui/combat-hud/combat-hud-default'),
			templates: [
				systemTemplatePath('ui/partials/combat-bar-hp'),
				systemTemplatePath('ui/partials/combat-bar-mp'),
				systemTemplatePath('ui/partials/combat-bar-ip'),
				systemTemplatePath('ui/partials/combat-bar-zeropower'),
				systemTemplatePath('ui/partials/combat-bar-fp'),
				systemTemplatePath('ui/partials/combat-bar-zenit'),
				systemTemplatePath('ui/partials/combat-bar-exp'),
			],
		},
		'fu-modern': {
			template: systemTemplatePath('ui/combat-hud/combat-hud-modern'),
			templates: [
				systemTemplatePath('ui/partials/combat-bar-hp-modern'),
				systemTemplatePath('ui/partials/combat-bar-mp-modern'),
				systemTemplatePath('ui/partials/combat-bar-ip-modern'),
				systemTemplatePath('ui/partials/combat-bar-fp-modern'),
				systemTemplatePath('ui/partials/combat-bar-zeropower-modern'),
				systemTemplatePath('ui/partials/combat-bar-zenit-modern'),
				systemTemplatePath('ui/partials/combat-bar-exp-modern'),
			],
		},
		'fu-mother': {
			template: systemTemplatePath('ui/combat-hud/combat-hud-mother'),
			templates: [
				systemTemplatePath('ui/partials/combat-bar-hp-mother'),
				systemTemplatePath('ui/partials/combat-bar-mp-mother'),
				systemTemplatePath('ui/partials/combat-bar-ip-mother'),
				systemTemplatePath('ui/partials/combat-bar-fp-mother'),
				systemTemplatePath('ui/partials/combat-bar-zeropower-mother'),
				systemTemplatePath('ui/partials/combat-bar-zenit-mother'),
				systemTemplatePath('ui/partials/combat-bar-exp-mother'),
			],
		},
	};

	constructor(options) {
		super(options);

		this._emptyImage = document.createElement('img');
		this._emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

		// Drag trackers
		this.dragInitialX = 0;
		this.dragInitialY = 0;
		this.dragInitialTop = 0;
		this.dragInitialLeft = 0;
		this.firefoxDragX = 0;
		this.firefoxDragY = 0;

		// TODO: Move such browser checks to a higher scope
		this.isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

		console.debug(`Combat HUD: Constructing`);
		Hooks.callAll('combatHudInit', this);
		this.#hooks.push({ hook: 'createCombatant', func: this._onUpdateHUD.bind(this) });
		this.#hooks.push({ hook: 'deleteCombatant', func: this._onUpdateHUD.bind(this) });

		this.#hooks.push({ hook: 'updateActor', func: this._onUpdateActor.bind(this) });
		this.#hooks.push({ hook: 'updateToken', func: this._onUpdateToken.bind(this) });
		this.#hooks.push({ hook: 'updateCombatant', func: this._onUpdateCombatant.bind(this) });

		this.#hooks.push({ hook: 'updateItem', func: this._onUpdateItem.bind(this) });
		this.#hooks.push({ hook: 'createItem', func: this._onCreateDeleteItem.bind(this) });
		this.#hooks.push({ hook: 'deleteItem', func: this._onCreateDeleteItem.bind(this) });

		this.#hooks.push({ hook: 'createActiveEffect', func: this._onModifyActiveEffect.bind(this) });
		this.#hooks.push({ hook: 'updateActiveEffect', func: this._onModifyActiveEffect.bind(this) });
		this.#hooks.push({ hook: 'deleteActiveEffect', func: this._onModifyActiveEffect.bind(this) });

		this.#hooks.push({ hook: 'combatStart', func: this._onUpdateHUD.bind(this) });
		this.#hooks.push({ hook: 'combatTurn', func: this._onUpdateHUD.bind(this) });
		this.#hooks.push({ hook: 'combatTurnChange', func: this._onUpdateHUD.bind(this) });
		this.#hooks.push({ hook: `combatRound`, func: this._onUpdateHUD_Round.bind(this) });

		this.#hooks.push({ hook: 'deleteCombat', func: this._onCombatEnd.bind(this) });

		//this.#hooks.push({ hook: 'updateSettings', func: this._onUpdateHUD.bind(this) });
		this.#hooks.push({ hook: FUHooks.ROLL_STUDY, func: this._onStudyRoll.bind(this) });

		this.#hooks.forEach(({ hook, func }) => Hooks.on(hook, func));
		Hooks.once('ready', this._onGameReady.bind(this));
		console.debug(`Combat HUD: Ready`);
	}

	_getAdditionalStyle(opacity) {
		const theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme);
		switch (theme) {
			case 'fu-default':
				return (
					'--hud-opacity: ' +
					opacity +
					';' +
					'--hud-background-gradient: linear-gradient(to bottom, rgba(44, 88, 77, var(--hud-opacity)), rgba(160, 205, 188, var(--hud-opacity))), rgba(43, 74, 66, var(--hud-opacity));' +
					'--hud-boxshadow-color: rgba(43, 74, 66, var(--hud-opacity));'
				);
			case 'fu-modern':
				return (
					'--hud-opacity: ' +
					0 +
					';' +
					'--hud-background-gradient: linear-gradient(to bottom, rgba(44, 88, 77, var(--hud-opacity)), rgba(160, 205, 188, var(--hud-opacity))), rgba(43, 74, 66, var(--hud-opacity));' +
					'--hud-boxshadow-color: rgba(43, 74, 66, var(--hud-opacity));'
				);
			case 'fu-mother':
				return (
					'--hud-opacity: ' +
					opacity +
					';' +
					'--hud-background-gradient: rgba(40, 8, 40, var(--hud-opacity));' +
					'--hud-boxshadow-color: ' +
					'0 0 0 5px rgba(56, 48, 80, var(--hud-opacity)), ' +
					'0 0 0 10px rgba(104, 208, 184, var(--hud-opacity)), ' +
					'0 0 0 12px rgba(247, 232, 168, var(--hud-opacity)), ' +
					'0 0 0 15px rgba(61, 60, 85, var(--hud-opacity));'
				);
		}
	}

	_resetCombatState(full = true) {
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudMinimized, false);

		if (full) {
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudCompact, false);
			game.settings.set(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, {});

			if (game.user.isGM) {
				game.settings.set(SYSTEM, SETTINGS.optionCombatHudActorOrdering, []);
			}
		}
	}

	_resetButtons() {
		const tokenButton = ui.controls.controls[SYSTEM];

		if (tokenButton) {
			let tool = tokenButton.tools['projectfu-combathud-toggle'];
			tool.active = false;
			tool.visible = false;

			tool = tokenButton.tools['projectfu-combathud-reset'];
			tool.visible = false;

			ui.controls.render(true);
		}
	}

	_getResourcePartial(resource) {
		if (resource === 'none') return false;

		let theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme).replace('fu-', '');
		if (theme === 'default') theme = '';
		else theme = '-' + theme;

		const basePath = 'systems/projectfu/templates/ui/partials/combat-bar-';
		return basePath + resource + theme + '.hbs';
	}

	async _prepareContext(options = {}) {
		const data = await super._prepareContext(options);
		data.cssClasses = this.options.classes.join(' ');
		data.cssId = this.options.id;
		data.isCompact = game.settings.get(SYSTEM, SETTINGS.optionCombatHudCompact);

		const opacity = game.settings.get(SYSTEM, SETTINGS.optionCombatHudOpacity) / 100;
		data.additionalStyle = this._getAdditionalStyle(opacity);

		const ordering = game.settings.get(SYSTEM, SETTINGS.optionCombatHudActorOrdering);
		data.npcs = [];
		data.characters = [];

		if (!game.combat) return data;

		const trackedResourcePart1 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource1));
		const trackedResourcePart2 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource2));
		const trackedResourcePart3 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource3));
		const trackedResourcePart4 = this._getResourcePartial(game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource4));
		let barCount = 0;
		if (trackedResourcePart1) {
			barCount++;
		}
		if (trackedResourcePart2) {
			barCount++;
		}
		if (trackedResourcePart3) {
			barCount++;
		}
		if (trackedResourcePart4) {
			barCount++;
		}

		/** @type FUCombat **/
		const combat = game.combat;
		combat.populateData(data);

		// TODO: Much of this data is also required by the Combat Tracker, but populated in an entirely different way!
		for (const combatant of game.combat.combatants) {
			if (!combatant.actor || !combatant.token) continue;
			if (combatant.hidden) continue;

			const activeEffects = (game.release.generation >= 11 ? Array.from(combatant.actor.temporaryEffects) : combatant.actor.effects.filter((e) => e.isTemporary)).filter((e) => !e.disabled && !e.isSuppressed);
			const actorData = {
				id: combatant.id,
				name: combatant.name,
				actor: combatant.actor,
				isOwner: combatant.isOwner,
				totalTurns: combatant.totalTurns,
				token: combatant.token,
				faction: combatant.faction,
				effects: activeEffects,
				img: game.settings.get(SYSTEM, SETTINGS.optionCombatHudPortrait) === 'token' ? await this._getCombatantThumbnail(combatant) : combatant.actor.img,
				trackedResourcePart1: trackedResourcePart1,
				trackedResourcePart2: trackedResourcePart2,
				trackedResourcePart3: trackedResourcePart3,
				trackedResourcePart4: trackedResourcePart4,
				opacity: opacity,
				zeropower: {
					progress: {
						current: 0,
						max: 0,
					},
				},
			};
			actorData.hasEffects = actorData.effects.length > 0 && game.settings.get(SYSTEM, SETTINGS.optionCombatHudShowEffects);

			switch (barCount) {
				case 1:
					actorData.rowClass = 'one-bar';
					break;
				case 2:
					actorData.rowClass = 'two-bars';
					break;
				case 3:
				case 4:
					actorData.rowClass = 'three-bars';
					break;
				default:
					actorData.rowClass = 'no-bars';
					break;
			}

			const zeroPower = combatant.actor.items.find((i) => i.type === 'optionalFeature' && i.system.optionalType === 'projectfu.zeroPower');
			if (zeroPower) {
				actorData.zeropower = zeroPower.system.data;
			}

			if (actorData.hasEffects) {
				const maxEffectsBeforeMarquee = 5;
				const effectsMarqueeDuration = game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeDuration);

				// Ensure shouldEffectsMarquee is false if effectsMarqueeDuration is over 9000
				actorData.shouldEffectsMarquee = actorData.effects.length > maxEffectsBeforeMarquee && effectsMarqueeDuration < 9000;
				actorData.effectsMarqueeDuration = effectsMarqueeDuration;

				actorData.marqueeDirection = game.settings.get(SYSTEM, SETTINGS.optionCombatHudEffectsMarqueeMode);
			}

			let order = 0;
			const prevOrder = ordering.find((o) => o.tokenId === combatant.token.id);
			if (prevOrder) {
				order = prevOrder.order;
			} else {
				if (combatant.token.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
					order = data.characters.length + 1;
				} else {
					order = data.npcs.length + 1;
				}

				ordering.push({
					tokenId: combatant.token.id,
					order: order,
				});
			}

			actorData.order = order;

			if (!FUCombat.showTurnsFor(combatant)) {
				actorData.hideTurns = true;
			}

			if (combatant.token.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
				data.characters.push(actorData);
			} else {
				data.npcs.push(actorData);
			}
		}

		data.characters.sort((a, b) => a.order - b.order);
		data.npcs.sort((a, b) => a.order - b.order);

		this._backupOrdering = ordering;
		return data;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);

		const rows = this.element.querySelectorAll(`.combat-row`);
		const hoverIn = this._onHoverIn.bind(this);
		const hoverOut = this._onHoverOut.bind(this);
		const dragCombatantStart = this._doCombatantDragStart.bind(this);
		const dragCombatantDrop = this._doCombatantDrop.bind(this);

		for (const row of rows) {
			if (row instanceof HTMLElement) {
				row.addEventListener('mouseenter', hoverIn);
				row.addEventListener('mouseleave', hoverOut);

				if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering) && game.user.isGM) {
					row.addEventListener('dragstart', dragCombatantStart);
					row.addEventListener('drop', dragCombatantDrop);
				}
			}
		}

		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering) && game.user.isGM) {
			const images = this.element.querySelectorAll(`.combat-row .combat-image`);
			for (const image of images) {
				if (image instanceof HTMLElement) {
					image.setAttribute('draggable', true);
					image.addEventListener('dragstart', dragCombatantStart);
					image.addEventListener('drop', dragCombatantDrop);
				}
			}
		}

		const dragButton = this.element.querySelector('.window-drag');
		dragButton.addEventListener('dragstart', this._doHudDragStart.bind(this));
		dragButton.addEventListener('drag', this._doHudDrag.bind(this));
		dragButton.addEventListener('dragend', this._doHudDrop.bind(this));

		if (this.isFirefox) window.document.addEventListener('dragover', this._fireFoxDragWorkaround.bind(this));

		this._setStartStopButtonVisibility();

		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) {
			this.close();
			return;
		}
		this._setSizeAndPosition();
		this._setEffectContextMenus();
	}

	_setEffectContextMenus() {
		new foundry.applications.ux.ContextMenu(
			this.element,
			'.combat-effects [data-effect-id][data-actor-id]',
			[
				{
					name: 'FU.EffectEdit',
					icon: `<i class="fas fa-edit"></i>`,
					callback: (elem) => {
						const effect = this._getEffectFromElement(elem);
						if (!effect) return;
						new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render({ force: true });
					},
					condition: (elem) => this._canModifyEffectContextMenu(elem),
				},
				{
					name: 'FU.EffectToggle',
					icon: `<i class="fas fa-circle-check"></i>`,
					callback: async (elem) => {
						const effect = this._getEffectFromElement(elem);
						if (!effect || !effect.canUserModify(game.user, 'update')) return;
						await effect.update({ disabled: !effect.disabled });
					},
					condition: (elem) => this._canModifyEffectContextMenu(elem, 'update'),
				},
				{
					name: 'FU.EffectDelete',
					icon: `<i class="fas fa-trash"></i>`,
					callback: async (elem) => {
						const effect = this._getEffectFromElement(elem);
						if (!effect || !effect.canUserModify(game.user, 'delete')) return;
						await effect.delete();
					},
					condition: (elem) => this._canModifyEffectContextMenu(elem, 'delete'),
				},
			],
			{
				jQuery: false,
				fixed: true,
			},
		);
	}

	/**
	 * Determine whether or not the current user has sufficient permission to edit
	 * @param {HTMLElement} elem - The HTMLElement (or jQuery wrapper) for the ActiveEffect in question
	 * @param {'update' | 'delete'} op - The operation to check -- either "update" or "delete"
	 * @returns
	 */
	_canModifyEffectContextMenu(elem, op = 'update') {
		const effect = this._getEffectFromElement(elem);
		if (!effect) return false;
		return effect.canUserModify(game.user, op);
	}

	/**
	 * Retrieves an ActiveEffect from an HTML element
	 * @param {HTMLElement} element - The HTMLElement (or jQuery wrapper) for the ActiveEffect in question
	 * @returns ActiveEffect or undefined
	 */
	_getEffectFromElement(element) {
		const effectId = element.dataset.effectId;
		const actorId = element.dataset.actorId;
		const actor = game.actors.get(actorId);
		if (!actor) return;
		return actor.effects.get(effectId);
	}

	_setStartStopButtonVisibility() {
		const startButton = this.element.querySelector(`.window-start`);
		const stopButton = this.element.querySelector(`.window-stop`);

		if (game.combat?.started) {
			if (startButton instanceof HTMLElement) startButton.classList.add('hidden');
			if (stopButton instanceof HTMLElement) stopButton.classList.remove('hidden');
		} else {
			if (startButton instanceof HTMLElement) startButton.classList.remove('hidden');
			if (stopButton instanceof HTMLElement) stopButton.classList.add('hidden');
		}
	}

	_setSizeAndPosition() {
		const element = this.element.querySelector(`#combat-hud`);

		if (this._poppedOut) {
			element.style.width = 'calc(100% - 4px)';
			element.style.height = '100%';
			element.style.left = '0px';
			return;
		}

		const hOffset = -5;
		let minWidth = 700;
		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme) === 'fu-modern') {
			minWidth = 805;
		}
		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme) === 'fu-mother') {
			minWidth = 805;
		}

		const uiLeft = document.querySelector(`#ui-left`);
		const uiMiddle = document.querySelector(`#ui-middle`);
		const uiRight = document.querySelector(`#ui-right`);

		let hudWidth = uiMiddle.clientWidth + uiLeft.clientWidth * 0.5;
		if (hudWidth < minWidth) {
			hudWidth = minWidth;
		}

		let uiRightWidth = uiRight.length ? uiRight.clientWidth : 0;
		hudWidth -= uiRightWidth * 0.5;

		const alpha = game.settings.get(SYSTEM, SETTINGS.optionCombatHudWidth) / 100;
		hudWidth = this.lerp(minWidth, hudWidth, alpha);

		element.style.width = `${hudWidth - hOffset}px`;

		const { position, positionButton } = this._getPosition();
		if (position.top) {
			element.style.top = `${position.top}px`;
		}
		if (position.bottom) {
			element.style.bottom = `${position.bottom}px`;
		}
		if (position.left) {
			element.style.left = `${position.left}px`;
		}

		// Apply button position
		this._applyButtonPosition(positionButton);
	}

	_doHudDragStart(event) {
		if (event instanceof DragEvent) {
			event.dataTransfer.setDragImage(this._emptyImage, 0, 0);
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.dropEffect = 'move';
			const elem = this.element.querySelector(`#combat-hud`);
			this.dragInitialLeft = event.clientX - elem.offsetLeft;
			this.dragInitialTop = event.clientY - elem.offsetTop;

			this.firefoxDragX = 0;
			this.firefoxDragY = 0;
		}
	}

	_fireFoxDragWorkaround(event) {
		if (event instanceof DragEvent) {
			// Keep this check; drag events can trigger with (0,0) when outside the window or target
			// and they should be treated as invalid
			if (event.clientX <= 0 || event.clientY <= 0) return;

			// These need to be tracked separately
			// The listener is listening to *any* drag on window, and may not be relevant to the combatHUD
			// So the actual update should be deferred to _doHudDrag which is bound specifically to combatHUD
			this.firefoxDragX = event.clientX;
			this.firefoxDragY = event.clientY;
		}
	}

	_doHudDrag(event) {
		if (event instanceof DragEvent) {
			const elem = this.element.querySelector(`#combat-hud`);

			const dragPosition = this.isFirefox
				? {
						x: this.firefoxDragX,
						y: this.firefoxDragY,
					}
				: {
						x: event.clientX,
						y: event.clientY,
					};

			// Keep this check; drag events can trigger with (0,0) when outside the window or target
			// and they should be treated as invalid
			if (dragPosition.x <= 0 || dragPosition.y <= 0) return;

			// Delay the actual drag animation by a frame to ensure that it's handled after
			// the firefox workaround drag handler
			if (this._dragAnimationFrame) cancelAnimationFrame(this._dragAnimationFrame);

			this._dragAnimationFrame = requestAnimationFrame(() => {
				const dragButton = elem.querySelector(`.window-drag`);

				const deltaX = dragPosition.x - this.dragInitialX - dragButton.clientWidth;
				const deltaY = dragPosition.y - this.dragInitialY + dragButton.clientHeight;

				const newLeft = this.dragInitialLeft + deltaX;
				const newTop = this.dragInitialTop + deltaY;

				elem.style.left = `${newLeft}px`;
				elem.style.top = `${newTop}px`;
				if (elem.style.bottom !== 'initial') elem.style.bottom = 'initial';
				cancelAnimationFrame(this._dragAnimationFrame);
				this._dragAnimationFrame = null;
			});
		}
	}

	_doHudDrop(event) {
		if (event instanceof DragEvent) {
			const elem = this.element.querySelector(`#combat-hud`);
			const offset = {
				x: elem.offsetLeft,
				y: elem.offsetTop,
			};
			const height = elem.clientHeight;

			const positionFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition) === 'top';
			const draggedPosition = {
				x: offset.x,
				y: positionFromTop ? offset.y : window.innerHeight - offset.y - height,
			};

			game.settings.set(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, draggedPosition);
		}
	}

	static StartCombat() {
		this._doStartCombat();
	}

	async _doStartCombat() {
		if (!game.user.isGM) return;
		if (!game.combat) return;

		console.debug(`Combat HUD: Starting combat`);

		await game.combat.startCombat();

		this._setStartStopButtonVisibility();

		this._onUpdateHUD();
	}

	static StopCombat() {
		this._doStopCombat();
	}

	async _doStopCombat() {
		if (!game.user.isGM) return;
		if (!game.combat) return;

		console.debug(`Combat HUD: Stopping combat`);

		await game.combat.endCombat();

		this._setStartStopButtonVisibility();
	}

	_onGameReady() {
		Hooks.on('canvasReady', this._onCanvasDraw.bind(this));
		Hooks.on('preUpdateScene', this._preUpdateScene.bind(this));

		if (!game.user.isGM) return;
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudActorOrdering, this._backupOrdering ?? []);
	}

	_onCanvasDraw() {
		setTimeout(() => {
			if (game.combat && game.combat.isActive) {
				CombatHUD.init();
			} else {
				this._resetCombatState(false);
				this._resetButtons();
				CombatHUD.close();
			}
		}, 300);
	}

	_preUpdateScene() {
		console.log('preUpdateScene');
		setTimeout(() => {
			if (game.combat && game.combat.isActive) {
				CombatHUD.init();
			} else {
				this._resetCombatState(false);
				this._resetButtons();
				CombatHUD.close();
			}
		}, 300);
	}

	_doCombatantDragStart(event) {
		if (!game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering)) return;
		if (!game.user.isGM) return;

		const actualEvent = event.originalEvent ?? event;

		actualEvent.dataTransfer.dropEffect = 'move';

		const dropData = {
			token: event.currentTarget.dataset.tokenId,
			actor: event.currentTarget.dataset.actorId,
			type: event.currentTarget.dataset.type,
		};
		actualEvent.dataTransfer.setData('text/plain', JSON.stringify(dropData));
	}

	_doDragOver(event) {}

	_doCombatantDrop(event) {
		if (!event.currentTarget.classList.contains('combat-row')) return;
		if (!game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering)) return;
		if (!game.user.isGM) return;

		const combatRowOver = event.currentTarget.closest('.combat-row');
		const actorTypeOver = combatRowOver.dataset.type;

		const actualEvent = event.originalEvent ?? event;
		const data = JSON.parse(actualEvent.dataTransfer.getData('text/plain'));
		const actorTypeDragged = data.type;

		if (actorTypeOver !== actorTypeDragged) {
			event.preventDefault();
			return;
		}

		// const faction = actorTypeOver === 'character' ? '.characters' : '.npcs';
		const combatRowDragged = this.element.querySelector(`.combat-row[data-token-id="${data.token}"]`);

		const orderOver = parseInt(combatRowOver.dataset.order);
		const orderDragged = parseInt(combatRowDragged.dataset.order);

		combatRowOver.dataset.order = orderDragged;
		let orderElems = combatRowDragged.querySelectorAll('.combat-order');
		for (const elem of orderElems) {
			if (elem instanceof HTMLElement) elem.innerHTML = orderDragged;
		}

		combatRowDragged.dataset.order = orderOver;
		orderElems = combatRowDragged.querySelectorAll(`.combat-order`);
		for (const elem of orderElems) {
			if (elem instanceof HTMLElement) elem.innerHTML = orderOver;
		}

		// Update ordering cache
		const ordering = game.settings.get(SYSTEM, SETTINGS.optionCombatHudActorOrdering);
		ordering.find((o) => o.tokenId === data.token).order = orderOver;
		ordering.find((o) => o.tokenId === combatRowOver.dataset.tokenId).order = orderDragged;
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudActorOrdering, ordering);
	}

	static MinimizeHUD() {
		this._doMinimize();
	}

	_doMinimize() {
		console.debug(`Combat HUD: Minimizing (Internal)`);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudMinimized, true);

		const tokenButton = ui.controls.controls[SYSTEM];

		if (tokenButton) {
			const tool = tokenButton.tools['projectfu-combathud-toggle'];
			if (tool) tool.active = false;
			ui.controls.render(true);
		}

		CombatHUD.close();
	}

	static ToggleCompactMode() {
		this._doToggleCompact();
	}

	_doToggleCompact() {
		if (!game.combat) return;

		const isCompact = !game.settings.get(SYSTEM, SETTINGS.optionCombatHudCompact);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudCompact, isCompact);

		const icons = this.element.querySelectorAll(`.window-compact .fas`);
		for (const icon of icons) {
			if (icon instanceof HTMLElement) icon.classList.toggle('hidden');
		}

		const factionLists = this.element.querySelectorAll(`.faction-list`);
		for (const list of factionLists) {
			if (list instanceof HTMLElement) list.classList.toggle('compact');
		}
	}

	static PopOutHUD() {
		this._doPopOut();
	}

	_doPopOut() {
		/* globals PopoutModule */
		if (typeof PopoutModule !== 'undefined' && PopoutModule.singleton) {
			ui.windows[this.appId] = this;
			this._poppedOut = true;
			this.element.find('.window-popout').css('display', 'none');
			this.element.find('.window-compact').css('display', 'none');
			this.element.find('.window-minimize').css('display', 'none');
			PopoutModule.singleton.onPopoutClicked(this);
		} else {
			ui.notifications.warn('FU.CombatHudPopoutNotInstalled', { localize: true });
		}
	}

	static ClickCombatant(e, elem) {
		this._onCombatantClick(e, elem);
	}

	_onCombatantClick(event, elem) {
		const now = Date.now();
		const dt = now - this._clickTime;
		this._clickTime = now;
		if (dt <= 250) {
			this._onCombatantDoubleClick(event, elem);
			return;
		}

		const isShiftActive = game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT);

		const token = canvas.tokens.get(elem.dataset.tokenId);
		if (token) {
			if (!token.actor?.testUserPermission(game.user, 'OBSERVER')) {
				return;
			}

			token.control({ releaseOthers: !isShiftActive });
		}
	}

	_onCombatantDoubleClick(event, elem) {
		event.preventDefault();

		// const combatRow = event.currentTarget.closest('.combat-row');
		// const token = canvas.tokens.get(combatRow.dataset.tokenId);
		const token = canvas.tokens.get(elem.dataset.tokenId);

		if (token) {
			const combatant = game.combat.combatants.find((c) => c.tokenId === token.id);
			if (combatant.token.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
				this._onCharacterDoubleClick(token);
			} else {
				this._onNPCDoubleClick(token);
			}
		}
	}

	_onCharacterDoubleClick(token) {
		if (!token) return;
		if (!token.actor?.testUserPermission(game.user, 'OBSERVER') && !game.user.isGM) return;

		token.actor?.sheet.render(true);
	}

	_onNPCDoubleClick(token) {
		if (!token) return;

		if (game.user.isGM) {
			const actorSheet = token.actor.sheet;
			if (actorSheet) {
				actorSheet.render(true);
			}
		} else {
			const uuid = token.actor.resolveUuid();
			FUPartySheet.inspectAdversary(uuid);
		}
	}

	lerp(a, b, alpha) {
		return a + alpha * (b - a);
	}

	_getPosition() {
		const draggedPosition = game.settings.get(SYSTEM, SETTINGS.optionCombatHudDraggedPosition);
		const positionFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition) === 'top';
		// const uiLeft = $('#ui-left');
		const uiMiddle = $('#ui-middle');

		const position = {};

		// Handle main element position
		// position.left = draggedPosition && draggedPosition.x ? draggedPosition.x : uiMiddle.position().left - uiLeft.width() * 0.5;
		position.left = draggedPosition && draggedPosition.x ? draggedPosition.x : uiMiddle.position().left;
		if (positionFromTop) {
			// const uiTop = $('#ui-top');
			// position.top = draggedPosition && draggedPosition.y ? draggedPosition.y : uiTop.height() + 20;
			position.top = draggedPosition && draggedPosition.y ? draggedPosition.y : 20;
		} else {
			// const uiBottom = $('#ui-bottom');
			const uiBottom = $('#hotbar');
			position.bottom = draggedPosition && draggedPosition.y ? draggedPosition.y : uiBottom.height() + 35;
		}

		const positionButtonFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPositionButton) === 'top';

		const positionButton = {};
		if (positionButtonFromTop) {
			// Set button to top if option is set to 'top'
			positionButton.top = '-2em';
			positionButton.bottom = 'none';
		} else {
			// Set button to bottom if option is set to 'bottom'
			positionButton.top = 'none';
			positionButton.bottom = '-2em';
		}

		return { position, positionButton };
	}

	_applyButtonPosition(positionButton) {
		const buttons = this.element.querySelectorAll(`.window-button`);
		for (const button of buttons) {
			if (button instanceof HTMLElement) {
				button.style.setProperty('--window-button-top', positionButton.top);
				button.style.setProperty('--window-button-bottom', positionButton.bottom);
			}
		}
	}

	_onUpdateHUD_Round() {
		this._onUpdateHUD();

		setTimeout(() => {
			this._onUpdateHUD();
		}, 300);
	}

	_onUpdateHUD() {
		if (!game.combat) return;
		if (!game.combat.isActive) return;

		this.render(true);
	}

	_onUpdateCombatant() {
		this._onUpdateHUD();
	}

	_onUpdateToken(token, changes) {
		// Is the updated token in the current combat?
		const combatant = game.combat?.combatants.find((c) => c.token.uuid === token.uuid);
		if (!combatant) {
			return;
		}

		// Are any of the changes relevant to the Combat HUD?
		if (game.settings.get(SYSTEM, 'optionCombatHudPortrait') === 'token' && foundry.utils.hasProperty(changes, 'texture.src')) {
			// Note: These properties are also used by the Combat Tracker
			// But it doesn't attempt to regenerate them like this.
			// Ultimately the token icon will be updated on the tracker the next time it refreshes.
			combatant._thumb = null;
			if (VideoHelper.hasVideoExtension(changes.texture.src)) {
				combatant.img = null;
				combatant._videoSrc = changes.texture.src;
			} else {
				combatant.img = changes.texture.src;
				delete combatant._videoSrc;
			}

			this._onUpdateHUD();
		} else if (foundry.utils.hasProperty(changes, 'name') || foundry.utils.hasProperty(changes, 'actorId') || foundry.utils.hasProperty(changes, 'disposition')) {
			this._onUpdateHUD();
		}
	}

	_onUpdateActor(actor, changes) {
		// Is the updated actor in the current combat?
		if (!game.combat?.combatants.some((c) => c.actor.uuid === actor.uuid)) {
			return;
		}

		const systemResources = ['hp', 'mp', 'ip', 'fp', 'exp', 'zenit'];

		const trackedResources = [
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource1),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource2),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource3),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource4),
		];

		// Are any of the changes relevant to the Combat HUD?
		if (trackedResources.filter((r) => systemResources.includes(r)).some((r) => foundry.utils.hasProperty(changes, `system.resources.${r}`))) {
			this._onUpdateHUD();
		}
	}

	_onCreateDeleteItem(item) {
		this._onModifyItem(item);
	}

	_onUpdateItem(item, changes) {
		this._onModifyItem(item, changes);
	}

	_onModifyItem(item, changes) {
		// Is the item owned by an actor in the current combat?
		if (item.parent?.documentName !== 'Actor' || !game.combat?.combatants.some((c) => c.actor.uuid === item.parent.uuid)) {
			return;
		}

		const trackedResources = [
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource1),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource2),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource3),
			game.settings.get(SYSTEM, SETTINGS.optionCombatHudTrackedResource4),
		];

		// Are any of the changes relevant to the combat HUD?
		if (
			(trackedResources.includes('zeropower') && item.type === 'optionalFeature' && item.system.optionalType === 'projectfu.zeroPower') ||
			// The optionalType can theoretically change, so make sure to check for it.
			(foundry.utils.hasProperty(changes, 'system.optionalType') &&
				// Progress changes aren't relevant during create/delete hooks.
				(!changes || foundry.utils.hasProperty(changes, 'system.data.progress.current') || foundry.utils.hasProperty(changes, 'system.data.progress.max')))
		) {
			this._onUpdateHUD();
		}
	}

	_onModifyActiveEffect(activeEffect, changes) {
		if (
			// Is the active effect targeting an actor in the current combat?
			!(activeEffect.target && game.combat?.combatants.some((c) => c.actor.uuid === activeEffect.target.uuid)) &&
			// Did the transfer property change on an effect on an item owned by an actor in the current combat?
			!(
				activeEffect.parent?.documentName === 'Item' &&
				activeEffect.parent.parent?.documentName === 'Actor' &&
				foundry.utils.hasProperty(changes, 'transfer') &&
				game.combat?.combatants.some((c) => c.actor.uuid === activeEffect.parent.parent.uuid)
			)
		) {
			return;
		}

		// At this point the effect stands a pretty good chance of being relevant, so this is optimal enough.
		this._onUpdateHUD();
	}

	_onHoverIn(event) {
		event.preventDefault();
		if (!canvas.ready) return;

		const combatRow = event.currentTarget;
		const token = canvas.tokens.get(combatRow.dataset.tokenId);
		if (token && token.isVisible) {
			if (!token.controlled) token._onHoverIn(event, { hoverOutOthers: true });

			this._hoveredToken = token;
		}

		combatRow.classList.add('hovered');
	}

	_onHoverOut(event) {
		event.preventDefault();
		if (!canvas.ready) return;

		if (this._hoveredToken) {
			this._hoveredToken._onHoverOut(event);
		}

		this._hoveredToken = null;

		const combatRow = event.currentTarget;
		combatRow.classList.remove('hovered');
	}

	_onCombatEnd() {
		this._resetCombatState(!game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved));
		this._resetButtons();
		this.close();
	}

	_onStudyRoll() {
		this._onUpdateHUD();
	}

	/**
	 *  @override
	 */
	close() {
		console.debug(`Combat HUD: Close`);
		if (this._poppedOut) {
			this._poppedOut = false;
			this.element.find('.window-popout').css('display', 'block');
			this.element.find('.window-compact').css('display', 'block');
			this.element.find('.window-minimize').css('display', 'block');
			return;
		}

		super.close();
	}

	unregisterHooks() {
		this.#hooks.forEach(({ hook, func }) => Hooks.off(hook, func));
	}

	static turnChanged() {
		if (!ui.combatHud) return;

		ui.combatHud._onUpdateHUD();
	}

	static roundChanged() {
		if (!ui.combatHud) return;

		ui.combatHud._onUpdateHUD_Round();
	}

	static async init() {
		console.debug(`Combat HUD: Initializing statically`);
		ui.combatHud ??= new CombatHUD();
		console.debug(`Combat HUD: First render`);

		await ui.combatHud.render(true);

		const systemButton = ui.controls.controls[SYSTEM];
		if (systemButton) {
			let tool = systemButton.tools.HUDToggle;
			if (tool) {
				tool.active = !game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized);
				tool.visible = true;
			}

			tool = systemButton.tools.hudReset;
			if (tool) {
				tool.visible = true;
			}

			ui.controls.render(true);
		}

		console.debug(`Combat HUD: Initializing finished`);
	}

	static update() {
		if (!game.combat) return;
		if (!game.combat.isActive) return;

		if (ui.combatHud) {
			ui.combatHud.render(true);
		}
	}

	static close() {
		console.debug(`Combat HUD: Closing`);
		if (ui.combatHud) {
			ui.combatHud.unregisterHooks();
			ui.combatHud.close();
		}

		ui.combatHud = null;
	}

	static minimize() {
		console.debug(`Combat HUD: Minimizing`);
		if (ui.combatHud) {
			ui.combatHud.unregisterHooks();
			ui.combatHud._doMinimize();
		}

		ui.combatHud = null;
	}

	static restore() {
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudMinimized, false);
		console.debug(`Combat HUD: Restore`);
		if (game.combat && game.combat.isActive) CombatHUD.init();
	}

	static reset() {
		if (!ui.combatHud) return;

		ui.combatHud._resetCombatState(!game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved));
		CombatHUD.update();
	}

	/**
	 * @return {HudButtonData}
	 */
	static getToggleControlButton() {
		return {
			name: game.i18n.localize('FU.CombatHudControlButtonTitle'),
			icon: 'fas fa-thumbtack',
			toggle: true,
			visible: game.combat ? game.combat.isActive : false,
			active: !game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized),

			onClick: () => {
				console.log('Click toggle');
				if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) {
					CombatHUD.restore();
				} else {
					CombatHUD.minimize();
				}
			},
		};
	}

	/**
	 * @return {HudButtonData}
	 */
	static getSavedControlButton() {
		return {
			name: game.i18n.localize('FU.CombatHudSaveButtonTitle'),
			icon: 'fas fa-lock',
			toggle: true,
			visible: game.combat ? game.combat.isActive : false,
			active: game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved),
			onClick: () => {
				console.log('Click save');
				const isSaved = game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved);
				game.settings.set(SYSTEM, SETTINGS.optionCombatHudSaved, !isSaved);
			},
		};
	}

	/**
	 * @return {HudButtonData}
	 */
	static getResetControlButton() {
		return {
			name: game.i18n.localize('FU.CombatHudResetButtonTitle'),
			icon: 'fas fa-undo',
			// visible: game.combat ? game.combat.isActive : false,
			visible: true,
			onClick: () => {
				console.log('Click reset');
				CombatHUD.reset();
			},
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

	_configureRenderOptions(options) {
		super._configureRenderOptions(options);

		// Set theme template
		const theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme);
		options.parts = [theme];

		return options;
	}

	static StartTurn(e) {
		ui.combat.handleStartTurn(e);
	}

	static EndTurn(e) {
		ui.combat.handleEndTurn(e);
	}

	static TakeTurnOutOfTurn(e) {
		ui.combat.handleTakeTurnOutOfTurn(e);
	}

	static async ClickEffect(e, elem) {
		const actor = game.actors.get(elem.dataset.actorId);
		if (!(actor instanceof Actor)) return;
		if (e.button === 0) {
			const effect = actor.effects.get(elem.dataset.effectId);
			// Currently, the HUD will actually only show temporary effects
			if (effect?.isTemporary) await effect.delete();
			else await effect.update({ disabled: !effect.disabled });
		}
	}
}
