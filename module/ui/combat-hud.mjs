import { SETTINGS } from '../settings.js';

import { SystemControls } from '../helpers/system-controls.mjs';
import { SYSTEM, FU } from '../helpers/config.mjs';
import { FUHooks } from '../hooks.mjs';
import { FUCombat } from './combat.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';

Hooks.once('setup', () => {
	if (game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud)) {
		Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, (tools) => {
			tools.push(CombatHUD.getToggleControlButton());
			tools.push(CombatHUD.getSavedControlButton());
			tools.push(CombatHUD.getResetControlButton());
		});
	}
});

export class CombatHUD extends Application {
	#hooks = [];

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

	static get defaultOptions() {
		const theme = game.settings.get(SYSTEM, SETTINGS.optionCombatHudTheme);
		let template = FU.combatHudThemeTemplates[theme];
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: 'combat-hud',
			popOut: false,
			template: `systems/projectfu/templates/ui/combat-hud/${template}.hbs`,
			classes: [...super.defaultOptions.classes, 'projectfu'],
		});
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
		const tokenButton = ui.controls.controls.find((control) => control.name === SYSTEM);
		if (tokenButton) {
			let tool = tokenButton.tools.find((tool) => tool.name === 'projectfu-combathud-toggle');
			tool.active = false;
			tool.visible = false;

			tool = tokenButton.tools.find((tool) => tool.name === 'projectfu-combathud-reset');
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

	async getData(options = {}) {
		const data = await super.getData(options);
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

	activateListeners(html) {
		super.activateListeners(html);

		const rows = html.find('.combat-row');
		rows.hover(this._onHoverIn.bind(this), this._onHoverOut.bind(this));

		if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering) && game.user.isGM) {
			rows.on('dragstart', this._doCombatantDragStart.bind(this));
			//rows.on('dragover', this._doDragOver.bind(this));
			rows.on('drop', this._doCombatantDrop.bind(this)); // this might not work. 'dragend' is the call for the draggable item, not 'drop'

			const images = rows.find('.combat-image');
			images.attr('draggable', true);
			images.on('dragstart', this._doCombatantDragStart.bind(this));
			// images.on('dragover', this._doDragOver.bind(this));
			images.on('drop', this._doCombatantDrop.bind(this)); // this might not work. 'dragend' is the call for the draggable item, not 'drop'
		}

		const combatantImages = html.find('.combat-row .token-image');
		combatantImages.click((event) => this._onCombatantClick(event));

		const combatantNames = html.find('.token-name');
		combatantNames.click((event) => this._onCombatantClick(event));

		const popOutButton = html.find('.window-popout');
		popOutButton.click(this._doPopOut.bind(this));

		const compactButton = html.find('.window-compact');
		compactButton.click(this._doToggleCompact.bind(this));

		const minimizeButton = html.find('.window-minimize');
		minimizeButton.click(this._doMinimize.bind(this));

		const dragButton = html.find('.window-drag');
		dragButton.on('dragstart', this._doHudDragStart.bind(this));
		dragButton.on('drag', this._doHudDrag.bind(this));
		dragButton.on('dragend', this._doHudDrop.bind(this));

		if (this.isFirefox) {
			$(window.document).on('dragover', this._fireFoxDragWorkaround.bind(this));
		}

		this._startCombatButton = html.find('.window-start');
		this._startCombatButton.click(this._doStartCombat.bind(this));

		this._stopCombatButton = html.find('.window-stop');
		this._stopCombatButton.click(this._doStopCombat.bind(this));

		if (game.combat && game.combat.started) {
			this._startCombatButton.addClass('hidden');
			this._stopCombatButton.removeClass('hidden');
		}

		html.find('a[data-action=start-turn]').click((event) => ui.combat.handleStartTurn(event));
		html.find('a[data-action=end-turn]').click((event) => ui.combat.handleEndTurn(event));
		html.find('a[data-action=take-turn-out-of-turn]').click((event) => ui.combat.handleTakeTurnOutOfTurn(event));

		const effectImages = html.find('.combat-effect-img');

		effectImages.on('click', async (event) => {
			event.preventDefault();
			const effectImg = event.currentTarget;
			const effectId = effectImg.dataset.effectId;
			const actorId = effectImg.dataset.actorId;
			const actor = game.actors.get(actorId);
			if (!actor) return;

			if (event.button === 0) {
				const effect = actor.effects.get(effectId);
				if (effect) {
					await effect.update({ disabled: !effect.disabled });
				}
			}
		});

		effectImages.on('contextmenu', async (event) => {
			event.preventDefault();
			const effectImg = event.currentTarget;
			const effectId = effectImg.dataset.effectId;
			const actorId = effectImg.dataset.actorId;
			const actor = game.actors.get(actorId);
			if (!actor) return;

			const effect = actor.effects.get(effectId);
			if (effect) {
				new ActiveEffectConfig(effect).render(true);
			}
		});
	}

	_doHudDragStart(event) {
		event.originalEvent.dataTransfer.setDragImage(this._emptyImage, 0, 0);

		// Set drag tracking vars
		const nativeEvent = event.originalEvent;
		const elementPos = this.element.position();
		this.dragInitialLeft = elementPos.left;
		this.dragInitialTop = elementPos.top;
		this.dragInitialX = nativeEvent.clientX;
		this.dragInitialY = nativeEvent.clientY;
		this.firefoxDragX = 0;
		this.firefoxDragY = 0;
	}

	// FireFox does not populate event.clientX or event.clientY
	// during drag events. A workaround is to bind a seperate handler
	// to the dragover event instead, which gets processed directly
	// before any drag event and allows us to record the current drag position.
	_fireFoxDragWorkaround(event) {
		// Keep this check; drag events can trigger with (0,0) when outside the window or target
		// and they should be treated as invalid
		if (event.clientX <= 0 || event.clientY <= 0) return;

		// These need to be tracked separately
		// The listener is listening to *any* drag on window, and may not be relevant to the combatHUD
		// So the actual update should be deferred to _doHudDrag which is bound specifically to combatHUD
		this.firefoxDragX = event.clientX;
		this.firefoxDragY = event.clientY;
	}

	_doHudDrag(event) {
		event.originalEvent.dataTransfer.dropEffect = 'move';

		// Firefox doesn't handle drag events the same as other browsers
		// We use the 'dragOver' event for that
		let dragPosition;
		if (this.isFirefox) {
			dragPosition = { x: this.firefoxDragX, y: this.firefoxDragY };
		} else {
			dragPosition = { x: event.clientX, y: event.clientY };
		}

		// Keep this check; drag events can trigger with (0,0) when outside the window or target
		// and they should be treated as invalid
		if (dragPosition.x <= 0 || dragPosition.y <= 0) return;

		// Update
		if (this._dragAnimationFrame) {
			cancelAnimationFrame(this._dragAnimationFrame);
		}
		this._dragAnimationFrame = requestAnimationFrame(() => {
			// Calculate deltas
			const deltaX = dragPosition.x - this.dragInitialX;
			const deltaY = dragPosition.y - this.dragInitialY;

			// Calculate final values
			const newLeft = this.dragInitialLeft + deltaX;
			const newTop = this.dragInitialTop + deltaY;

			// Apply
			this.element.css('left', newLeft);
			this.element.css('top', newTop);
			if (this.element.css('bottom') !== 'initial') {
				this.element.css('bottom', 'initial');
			}
		});
	}

	_doHudDrop() {
		const offset = this.element.offset();
		const height = this.element.outerHeight();
		const positionFromTop = game.settings.get(SYSTEM, SETTINGS.optionCombatHudPosition) === 'top';

		const draggedPosition = {
			x: offset.left,
			y: positionFromTop ? offset.top : $(window).height() - offset.top - height,
		};
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudDraggedPosition, draggedPosition);
	}

	async _doStartCombat() {
		if (!game.user.isGM) return;
		if (!game.combat) return;

		console.debug(`Combat HUD: Starting combat`);

		await game.combat.startCombat();

		this._startCombatButton.addClass('hidden');
		this._stopCombatButton.removeClass('hidden');

		this._onUpdateHUD();
	}

	async _doStopCombat() {
		if (!game.user.isGM) return;
		if (!game.combat) return;

		console.debug(`Combat HUD: Stopping combat`);

		await game.combat.endCombat();

		this._startCombatButton.removeClass('hidden');
		this._stopCombatButton.addClass('hidden');
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

		event.originalEvent.dataTransfer.dropEffect = 'move';
		event.originalEvent.dataTransfer.setData(
			'text/plain',
			JSON.stringify({
				token: event.currentTarget.dataset.tokenId,
				actor: event.currentTarget.dataset.actorId,
				type: event.currentTarget.dataset.type,
			}),
		);
	}

	_doDragOver(event) {}

	_doCombatantDrop(event) {
		if (!event.currentTarget.classList.contains('combat-row')) return;
		if (!game.settings.get(SYSTEM, SETTINGS.optionCombatHudReordering)) return;
		if (!game.user.isGM) return;

		const combatRowOver = event.currentTarget.closest('.combat-row');
		const actorTypeOver = combatRowOver.dataset.type;

		const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
		const actorTypeDragged = data.type;

		if (actorTypeOver !== actorTypeDragged) {
			event.preventDefault();
			return;
		}

		const faction = actorTypeOver === 'character' ? '.characters' : '.npcs';
		const combatRowDragged = this.element.find(`.combat-row[data-token-id="${data.token}"]`)[0];

		const orderOver = parseInt(combatRowOver.dataset.order);
		const orderDragged = parseInt(combatRowDragged.dataset.order);

		combatRowOver.dataset.order = orderDragged;
		$(combatRowOver).find('.combat-order').html(orderDragged);

		combatRowDragged.dataset.order = orderOver;
		$(combatRowDragged).find('.combat-order').html(orderOver);

		const ordering = game.settings.get(SYSTEM, SETTINGS.optionCombatHudActorOrdering);

		ordering.find((o) => o.tokenId === data.token).order = orderOver;
		ordering.find((o) => o.tokenId === combatRowOver.dataset.tokenId).order = orderDragged;

		game.settings.set(SYSTEM, SETTINGS.optionCombatHudActorOrdering, ordering);

		const factionList = this.element.find(faction);
		const rows = $(faction).find('.combat-row').detach();
		const sortedRows = $(rows.toArray().sort((a, b) => a.dataset.order - b.dataset.order));

		factionList.append(sortedRows);
	}

	_doMinimize() {
		console.debug(`Combat HUD: Minimizing (Internal)`);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudMinimized, true);

		const tokenButton = ui.controls.controls.find((control) => control.name === SYSTEM);
		if (tokenButton) {
			tokenButton.tools.find((tool) => tool.name === 'projectfu-combathud-toggle').active = false;
			ui.controls.render(true);
		}

		CombatHUD.close();
	}

	_doToggleCompact() {
		if (!game.combat) return;

		const isCompact = !game.settings.get(SYSTEM, SETTINGS.optionCombatHudCompact);
		game.settings.set(SYSTEM, SETTINGS.optionCombatHudCompact, isCompact);

		const icons = this.element.find('.window-compact .fas');
		icons.toggleClass('hidden');

		this.element.find('.faction-list').toggleClass('compact');
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

	_onCombatantClick(event) {
		const now = Date.now();
		const dt = now - this._clickTime;
		this._clickTime = now;
		if (dt <= 250) {
			this._onCombatantDoubleClick(event);
			return;
		}

		const isShiftActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);

		const combatRow = event.currentTarget.closest('.combat-row');
		const token = canvas.tokens.get(combatRow.dataset.tokenId);
		if (token) {
			if (!token.actor?.testUserPermission(game.user, 'OBSERVER')) {
				return;
			}

			token.control({ releaseOthers: !isShiftActive });
		}
	}

	_onCombatantDoubleClick(event) {
		event.preventDefault();

		const combatRow = event.currentTarget.closest('.combat-row');
		const token = canvas.tokens.get(combatRow.dataset.tokenId);

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

	/**
	 * @override
	 */
	async _render(force, options) {
		// if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) {
		// 	this.close();
		// 	return;
		// }

		await super._render(force, options);
		if (this._poppedOut) {
			this.element.css('width', 'calc(100% - 4px)');
			this.element.css('height', '100%');
			this.element.css('left', '0px');
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

		const uiLeft = $('#ui-left');
		const uiMiddle = $('#ui-middle');
		const uiRight = $('#ui-right');

		let hudWidth = uiMiddle.width() + uiLeft.width() * 0.5;
		if (hudWidth < minWidth) {
			hudWidth = minWidth;
		}

		let uiRightWidth = uiRight.length ? uiRight.width() : 0;
		hudWidth -= uiRightWidth * 0.5;

		const alpha = game.settings.get(SYSTEM, SETTINGS.optionCombatHudWidth) / 100;
		hudWidth = this.lerp(minWidth, hudWidth, alpha);

		this.element.css('width', hudWidth + hOffset);

		const { position, positionButton } = this._getPosition();
		if (position.top) {
			this.element.css('top', position.top);
		}
		if (position.bottom) {
			this.element.css('bottom', position.bottom);
		}
		if (position.left) {
			this.element.css('left', position.left);
		}

		// Apply button position
		this._applyButtonPosition(positionButton);
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
			const uiTop = $('#ui-top');
			position.top = draggedPosition && draggedPosition.y ? draggedPosition.y : uiTop.height() + 20;
		} else {
			const uiBottom = $('#ui-bottom');
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
		this.element.find('.window-button').css({
			'--window-button-top': positionButton.top,
			'--window-button-bottom': positionButton.bottom,
		});
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

	_onUpdateCombatant(combatant, changes) {
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

	static init() {
		console.debug(`Combat HUD: Initializing statically`);
		ui.combatHud ??= new CombatHUD();
		console.debug(`Combat HUD: First render`);

		ui.combatHud.render(true);

		setTimeout(() => {
			const systemButton = ui.controls.controls.find((control) => control.name === SYSTEM);
			if (systemButton) {
				let tool = systemButton.tools.find((tool) => tool.name === 'projectfu-combathud-toggle');
				tool.active = !game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized);
				tool.visible = true;

				tool = systemButton.tools.find((tool) => tool.name === 'projectfu-combathud-reset');
				tool.visible = true;

				ui.controls.render(true);
			}
		}, 200);

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

	static getToggleControlButton() {
		return {
			name: 'projectfu-combathud-toggle',
			title: game.i18n.localize('FU.CombatHudControlButtonTitle'),
			icon: 'fas fa-thumbtack',
			button: false,
			toggle: true,
			visible: game.combat ? game.combat.isActive : false,
			active: !game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized),
			onClick: () => {
				if (game.settings.get(SYSTEM, SETTINGS.optionCombatHudMinimized)) {
					CombatHUD.restore();
				} else {
					CombatHUD.minimize();
				}
			},
		};
	}

	static getSavedControlButton() {
		return {
			name: 'projectfu-combathud-saved-toggle',
			title: game.i18n.localize('FU.CombatHudSaveButtonTitle'),
			icon: 'fas fa-lock',
			button: false,
			toggle: true,
			visible: game.combat ? game.combat.isActive : false,
			active: game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved),
			onClick: () => {
				const isSaved = game.settings.get(SYSTEM, SETTINGS.optionCombatHudSaved);
				game.settings.set(SYSTEM, SETTINGS.optionCombatHudSaved, !isSaved);
			},
		};
	}

	static getResetControlButton() {
		return {
			name: 'projectfu-combathud-reset',
			title: game.i18n.localize('FU.CombatHudResetButtonTitle'),
			icon: 'fas fa-undo',
			button: true,
			visible: game.combat ? game.combat.isActive : false,
			onClick: () => {
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
			return (combatant._thumb = await game.video.createThumbnail(combatant._videoSrc, { width: 200, height: 200 }));
		}
		return combatant.img ?? CONST.DEFAULT_TOKEN;
	}
}
