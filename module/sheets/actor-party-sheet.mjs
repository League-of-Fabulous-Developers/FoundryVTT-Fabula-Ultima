import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { SystemControls } from '../helpers/system-controls.mjs';
import { FU, SYSTEM, systemPath } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { Flags } from '../helpers/flags.mjs';
import { MetaCurrencyTrackerApplication } from '../ui/metacurrency/MetaCurrencyTrackerApplication.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { MathHelper } from '../helpers/math-helper.mjs';
import { FUHooks } from '../hooks.mjs';
import { NpcProfileWindow } from '../ui/npc-profile.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { Pipeline } from '../pipelines/pipeline.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';
import { FUCombat } from '../ui/combat.mjs';
import { ResourcePipeline, ResourceRequest } from '../pipelines/resource-pipeline.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { getCurrencyString } from '../pipelines/inventory-pipeline.mjs';

/**
 * @description Creates a sheet that contains the details of a party composed of {@linkcode FUActor}
 * @property {FUActor} actor
 * @property {PartyDataModel} actor.system
 * @property {PartySheetActionHook[]} actionHooks
 * @extends {ActorSheet}
 */
export class FUPartySheet extends FUActorSheet {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: [],
		actions: {
			revealMetaCurrency: this.#revealMetaCurrency,
			revealActor: this.#revealActor,
			revealNpc: this.#onRevealNpc,
			restParty: this.#restParty,
			rewardResource: this.promptAwardResources,
			refreshSheet: this.#refreshSheet,
			addTrack: this.promptAddProgressTrack,
			removeTrack: this.#onRemoveProgressTrack,
			incrementProgress: this.#onIncrementProgressTrack,
			revealTrack: this.#onRevealProgressTrack,
			callHook: this.#callHook,
			activate: this.#activate,
		},
		position: { width: 920, height: 1000 },
		window: {
			contentClasses: ['party'],
			resizable: true,
		},
		dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
	};

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'overview', label: 'FU.Overview', icon: 'ra ra-double-team' },
				{ id: 'inventory', label: 'FU.Inventory', icon: 'ra ra-hand' },
				{ id: 'adversaries', label: 'FU.Adversaries', icon: 'ra ra-monster-skull' },
				{ id: 'settings', label: 'FU.Settings', icon: 'ra ra-wrench' },
			],
			initial: 'overview',
		},
	};

	/**
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		// Used to inject an HTML element to provide the blurred backdrop background element
		blur: {
			template: systemPath(`templates/actor/party/actor-party-blur-background.hbs`),
		},
		// Custom
		tabs: {
			template: systemPath('templates/actor/party/actor-party-section-nav.hbs'),
		},
		// Tabs
		overview: {
			template: systemPath('templates/actor/party/actor-party-section-overview.hbs'),
		},
		inventory: {
			template: systemPath('templates/actor/party/actor-party-section-inventory.hbs'),
		},
		adversaries: {
			template: systemPath('templates/actor/party/actor-party-section-adversaries.hbs'),
		},
		settings: {
			template: systemPath('templates/actor/party/actor-party-section-settings.hbs'),
		},
	};

	/**
	 * @returns {PartyDataModel}
	 */
	get party() {
		return this.actor.system;
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.actionHooks = FUPartySheet.prepareActionHooks();
		context.isGM = game.user.isGM;
		await ActorSheetUtils.prepareData(context, this);
		context.characters = await this.party.getCharacterData();
		context.companions = await this.party.getCompanionData();
		context.characterCount = this.party.characters.size + this.party.companions.size;
		const adversaries = await this.party.getAdversaryData();
		context.adversaries = FUPartySheet.sortAdversaryData(adversaries);
		const experience = this.party.calculateExperience();
		context.stats = {
			fp: experience.fp,
			up: experience.up,
			xp: experience.total,
			zenit: this.party.resources.zenit.value,
		};
		context.currency = getCurrencyString();

		return context;
	}

	/** @inheritdoc */
	_prepareTabs(group) {
		const tabs = super._prepareTabs(group);

		// This could probably do with better logic than "are they a GM?".
		if (!game.user.isGM) delete tabs.settings;
		return tabs;
	}

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		// IMPORTANT: Set the active tab
		if (partId in context.tabs) context.tab = context.tabs[partId];
		switch (partId) {
			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				break;
			case 'overview':
				break;
			case 'inventory':
				await ActorSheetUtils.prepareItems(context);
				await ActorSheetUtils.prepareInventory(context);
				break;
			case 'adversaries':
				break;
			case 'settings':
				break;
		}
		return context;
	}

	/**
	 * @param {NpcProfileData[]} data
	 * @returns {NpcProfileData[]}
	 */
	static sortAdversaryData(data) {
		// In
		let result = data.reverse();
		if (FUCombat.hasActiveEncounter) {
			const combat = FUCombat.activeEncounter;
			result = result.sort((a, b) => {
				const aInSet = combat.hasInstancedActor(a.uuid);
				a.active = aInSet;
				const bInSet = combat.hasInstancedActor(b.uuid);
				b.active = bInSet;
				if (aInSet && !bInSet) return -1;
				if (!aInSet && bInSet) return 1;
				return 0;
			});
		}
		return result;
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;
		ActorSheetUtils.activateDefaultListeners(html, this);
		ActorSheetUtils.activateInventoryListeners(html, this);
		ActorSheetUtils.activateStashListeners(html, this);

		// Right click on character
		this.setupCharacterContextMenu(html);
	}

	/**
	 * @this FUPartySheet
	 * @returns {Promise<void>}
	 */
	static async #activate() {
		console.debug(`Setting ${this.actor.name} as the active party`);
		game.settings.set(Flags.Scope, SETTINGS.activeParty, this.actor._id);
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #revealActor(event, target) {
		const uuid = target.dataset.actor;
		const actor = fromUuidSync(uuid);
		if (actor) {
			actor.sheet.render(true);
		} else {
			const type = target.dataset.type;
			switch (type) {
				case 'character':
					this.party.removeCharacter(uuid);
					break;
				case 'npc':
					this.party.removeAdversary(uuid);
					break;
				case 'companion':
					this.party.removeCompanion(uuid);
					break;
			}
		}
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRevealNpc(event, target) {
		const uuid = target.dataset.actor;
		await this.revealNpc(uuid);
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #callHook(event, target) {
		const hook = target.dataset.option;
		Hooks.call(hook);
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onIncrementProgressTrack(event, target) {
		const index = target.closest('[data-index]').dataset.index;
		const increment = target.dataset.increment;
		this.updateProgressTrack(index, Number.parseInt(increment));
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRevealProgressTrack(event, target) {
		const index = target.closest('[data-index]').dataset.index;
		this.revealProgressTrack(index);
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRemoveProgressTrack(event, target) {
		this.removeProgressTrack(Number(target.closest('[data-index]').dataset.index));
	}

	/**
	 * @description Handles a drop event
	 * @override
	 */
	async _onDrop(ev) {
		ev.preventDefault();

		// Retrieve drag data using TextEditor
		const data = TextEditor.getDragEventData(ev);
		if (data && data.type) {
			switch (data.type) {
				case 'Item': {
					const accepted = await ActorSheetUtils.handleInventoryItemDrop(this.actor, data, super._onDrop(ev));
					if (accepted) {
						return true;
					}
					break;
				}

				case 'Actor': {
					const actor = await Actor.implementation.fromDropData(data);
					console.debug(`${actor.name} was dropped onto party sheet`);
					if (actor.type === 'character') {
						await this.party.addCharacter(actor);
					} else if (actor.type === 'npc') {
						if (actor.system.rank.value === 'companion') {
							await this.party.addCompanion(actor);
						} else {
							await this.party.addOrUpdateAdversary(actor, 0);
						}
					}
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * @this FUPartySheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #revealMetaCurrency() {
		MetaCurrencyTrackerApplication.renderApp();
	}

	/**
	 * @this FUPartySheet
	 * @returns {Promise<void>}
	 */
	static async #refreshSheet() {
		this.render(true);
	}

	/**
	 * @this FUPartySheet
	 * @returns {Promise<void>}
	 */
	static async #restParty() {
		const actors = await this.party.getCharacterActors();
		for (const actor of actors) {
			await actor.rest(false);
			this.render(true);
		}
	}

	/**
	 * @param uuid
	 * @returns {Promise<void>}
	 */
	async revealNpc(uuid) {
		const data = await this.party.getAdversary(uuid);
		if (data) {
			new NpcProfileWindow(data, {
				title: data.name,
			}).render(true);
		} else {
			ui.notifications.warn(`Did not find an NPC profile for ${uuid}`);
		}
	}

	/**
	 * Prompts the GM to award resources to the party
	 */
	static async promptAwardResources() {
		const characters = await this.party.getCharacterActors();
		const defaultSource = StringUtils.localize('USER.RoleGamemaster');

		const result = await foundry.applications.api.DialogV2.input({
			window: { title: StringUtils.localize('FU.AwardResources') },
			content: await foundry.applications.handlebars.renderTemplate(systemPath('templates/dialog/dialog-award-resources.hbs'), {
				defaultSource: defaultSource,
				characters: characters,
			}),
			rejectClose: false,
			ok: {
				label: 'FU.Confirm',
			},
		});

		if (result) {
			const resource = result.resource;
			const source = result.source;
			const amount = result.amount;
			const selectedIds = result.recipients;
			console.log('Giving', resource, 'to:', selectedIds);
			const selectedActors = characters.filter((c) => selectedIds.includes(c.uuid));
			const request = new ResourceRequest(new InlineSourceInfo(source), selectedActors, resource, amount);
			if (amount > 0) {
				await ResourcePipeline.processRecovery(request);
			} else {
				await ResourcePipeline.processLoss(request);
			}
			return this.render(true);
		}
	}

	/**
	 * @description Adds a new progress track
	 */
	static async promptAddProgressTrack() {
		console.debug('Adding a progress track');

		const result = await foundry.applications.api.DialogV2.input({
			window: { title: game.i18n.localize('FU.ClockAdd') },
			content: await foundry.applications.handlebars.renderTemplate(systemPath('templates/dialog/dialog-add-party-clock.hbs'), {}),
			rejectClose: false,
			ok: {
				label: game.i18n.localize('FU.Confirm'),
			},
		});

		if (result) {
			if (!result.name) {
				return;
			}
			console.log('Creating progress track with name: ', result.name);

			const tracks = foundry.utils.duplicate(this.actor.system.tracks);

			const newTrack = ProgressDataModel.construct(result.name, result.max);
			tracks.push(newTrack);
			this.actor.update({ ['system.tracks']: tracks });
		}
	}

	/**
	 * @description  increment button click events for progress tracks
	 * @param {number} index The index of the progress track
	 * @param {number} increment
	 */
	updateProgressTrack(index, increment) {
		const tracks = foundry.utils.duplicate(this.actor.system.tracks);
		const track = tracks[index];
		if (track) {
			track.current = MathHelper.clamp(track.current + increment * track.step, 0, track.max);
			this.actor.update({ ['system.tracks']: tracks });
		} else {
			ui.notifications.error(`Failed to update progress track`);
		}
	}

	/**
	 * @param {number} index
	 */
	removeProgressTrack(index) {
		/** @type ProgressDataModel[] **/
		const tracks = foundry.utils.duplicate(this.actor.system.tracks);
		tracks.splice(index, 1);
		this.actor.update({ ['system.tracks']: tracks });
	}

	/**
	 * @param {number} index
	 */
	revealProgressTrack(index) {
		const tracks = this.actor.system.tracks;
		const track = tracks[index];
		if (track) {
			ProgressDataModel.sendToChat(this.actor, track);
		}
	}

	/**
	 * @description Sets up a context menu for characters in the overview
	 * @param html
	 */
	setupCharacterContextMenu(html) {
		// Don't provide this context menu to players
		if (!game.user.isGM) {
			return;
		}

		// Initialize the context menu options
		let contextMenuOptions = [
			{
				name: game.i18n.localize('FU.Delete'),
				icon: '<i class="fas fa-trash"></i>',
				callback: (el) => {
					const id = el.dataset.uuid;
					const type = el.dataset.type;
					switch (type) {
						case 'character':
							this.party.removeCharacter(id);
							break;
						case 'npc':
							this.party.removeAdversary(id);
							break;
						case 'companion':
							this.party.removeCompanion(id);
							break;
					}
				},
			},
			{
				name: game.i18n.localize('FU.Edit'),
				icon: '<i class="fa fa-pencil"></i>',
				callback: (el) => {
					const id = el.dataset.uuid;
					NpcProfileWindow.updateNpcProfile(this.party, id);
				},
				condition: (el) => el.dataset.type === 'npc',
			},
		];

		new foundry.applications.ux.ContextMenu(html, '.character-option', contextMenuOptions, {
			fixed: true,
			jQuery: false,
		});
	}

	/**
	 * @returns {PartySheetActionHook[]}
	 */
	static prepareActionHooks() {
		/** @type PartySheetActionHook[] **/
		let hooks = [];

		// Built-in support
		if (game.modules.get('lookfar')?.active) {
			console.debug('Automatically registering Lookfar Module');
			hooks.push({
				name: 'Travel Check',
				icon: 'fa-solid fa-person-hiking',
				hook: 'lookfarShowTravelCheckDialog',
			});
		}
		// TODO: Callback here...
		return hooks;
	}

	static async toggleActive() {
		const party = await FUPartySheet.getActiveModel();
		if (party) {
			const sheet = party.parent.sheet;
			if (sheet.rendered) {
				sheet.close();
			} else {
				sheet.render(true);
			}
		} else {
			ui.notifications.warn('FU.ActivePartyNotAssigned', { localize: true });
		}
	}

	/**
	 * @returns {Promise<PartyDataModel>}
	 */
	static async getActiveModel() {
		const activePartyUuid = game.settings.get(SYSTEM, SETTINGS.activeParty);
		if (activePartyUuid) {
			const party = fromUuidSync(`Actor.${activePartyUuid}`);
			if (party && party.type === 'party') {
				return party.system;
			}
		}
		return null;
	}

	/**
	 * @returns {Promise<FUActor>}
	 */
	static async getActive() {
		const activePartyUuid = game.settings.get(SYSTEM, SETTINGS.activeParty);
		if (activePartyUuid) {
			const party = fromUuidSync(`Actor.${activePartyUuid}`);
			if (party && party.type === 'party') {
				return party;
			}
		}
		return null;
	}

	/**
	 * @param {String} uuid
	 * @returns {Promise<void>}
	 */
	static async inspectAdversary(uuid) {
		const party = await FUPartySheet.getActive();
		if (party) {
			await party.sheet.revealNpc(uuid);
		}
	}
}

/**
 * @typedef PartySheetActionHook
 * @property {String} name The name to display
 * @property {String} icon A supported font icon
 * @property {String} hook The name of the hook to invoke
 */

// Set up sidebar menu option
Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);

/**
 * @param {SystemControlTool[]} tools
 */
function onGetSystemTools(tools) {
	tools.push({
		name: 'FU.Party',
		icon: 'fa-solid fa fa-users',
		onClick: () => {
			FUPartySheet.toggleActive();
		},
	});
}

/**
 * @param {StudyEvent} ev
 * @returns {Promise<void>}
 */
async function onStudyEvent(ev) {
	const activeParty = await FUPartySheet.getActiveModel();
	if (activeParty && ev.targets.length === 1) {
		const target = ev.targets[0].actor;
		console.debug(`Registering ${target.name} as an adversary`);
		const entry = await activeParty.addOrUpdateAdversary(target, ev.result);
		Hooks.call(FUHooks.PARTY_ADVERSARY_EVENT, entry);

		// Render a chat message
		const flags = Pipeline.initializedFlags(Flags.ChatMessage.Party, true);
		const studyResult = StudyRollHandler.resolveStudyResult(entry.study);
		// If the GM studied the NPC themselves, this will be equal
		const actorName = ev.actor.name === entry.name ? StringUtils.localize('USER.RoleGamemaster') : ev.actor.name;
		ChatMessage.create({
			speaker: ChatMessage.getSpeakerActor(ev.actor),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-study-event.hbs', {
				actor: actorName,
				target: entry.name,
				result: game.i18n.localize(FU.studyResult[studyResult]),
				uuid: entry.uuid,
			}),
			flags: flags,
		});
	}
}
Hooks.on(FUHooks.STUDY_EVENT, onStudyEvent);

/**
 * @param {Document} message
 * @param {HTMLElement} html
 */
async function onRenderChatMessage(message, html) {
	if (!message.getFlag(Flags.Scope, Flags.ChatMessage.Party)) {
		return;
	}

	// Find all elements with data-action="revealNpc"
	const elements = html.querySelectorAll('[data-action="revealNpc"]');
	for (const el of elements) {
		el.addEventListener(
			'click',
			async () => {
				const uuid = el.dataset.uuid;
				const party = await FUPartySheet.getActive();
				return party.sheet.revealNpc(uuid);
			},
			{ once: true },
		); // Optionally ensure it only attaches once
	}
}

Hooks.on('renderChatMessageHTML', onRenderChatMessage);

/**
 * @param {RevealEvent} event
 * @returns {Promise<void>}
 */
async function onRevealEvent(event) {
	const party = await FUPartySheet.getActiveModel();
	if (party) {
		console.info(`Revealing information on ${event.actor.name}: ${JSON.stringify(event.revealed)}`);
		const adversary = await party.getAdversary(event.actor.resolveUuid());
		// Not added if it was outside of combat, for example
		if (!adversary) {
			return;
		}
		if (!adversary.revealed) {
			adversary.revealed = {};
		}
		const [merged, changed] = ObjectUtils.mergeRecursive(adversary.revealed, event.revealed);
		if (changed) {
			adversary.revealed = merged;
			await party.updateAdversary(adversary);
		}
	}
}
Hooks.on(FUHooks.REVEAL_EVENT, onRevealEvent);
