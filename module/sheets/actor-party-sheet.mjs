import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { SystemControls } from '../helpers/system-controls.mjs';
import { FU, SYSTEM, systemPath } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { Flags } from '../helpers/flags.mjs';
import { MetaCurrencyTrackerApplication } from '../ui/metacurrency/MetaCurrencyTrackerApplication.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
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
import { getCurrencyString, InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { EquipmentTableRenderer } from '../helpers/tables/equipment-table-renderer.mjs';
import { Checks } from '../checks/checks.mjs';
import { TreasuresTableRenderer } from '../helpers/tables/treasures-table-renderer.mjs';
import { ConsumablesTableRenderer } from '../helpers/tables/consumables-table-renderer.mjs';
import { OtherItemsTableRenderer } from '../helpers/tables/other-items-table-renderer.mjs';

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
		classes: ['party'],
		actions: {
			createItem: this.#onCreate,
			editItem: this.#onEdit,
			roll: this.#onRoll,
			clearInventory: this.#onClearInventory,
			createEquipment: this.#onCreateEquipment,
			shareItem: this.#onShareItem,
			distributeZenit: this.#onDistributeZenit,

			revealMetaCurrency: this.#revealMetaCurrency,
			revealActor: this.#revealActor,
			revealNpc: this.#onRevealNpc,
			restParty: this.#restParty,
			rewardResource: this.promptAwardResources,
			refreshSheet: this.#refreshSheet,
			addTrack: this.#onAddTrack,
			removeTrack: this.#onRemoveTrack,
			updateTrack: { handler: this.#onUpdateTrack, buttons: [0, 2] },
			promptTrack: this.#onPromptTrack,

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

	#equipmentTable = new EquipmentTableRenderer();
	#treasuresTable = new TreasuresTableRenderer();
	#consumablesTable = new ConsumablesTableRenderer();
	#otherItemsTable = new OtherItemsTableRenderer('accessory', 'armor', 'consumable', 'shield', 'treasure', 'weapon');

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
				context.equipmentTable = await this.#equipmentTable.renderTable(this.document);
				context.treasuresTable = await this.#treasuresTable.renderTable(this.document);
				context.consumablesTable = await this.#consumablesTable.renderTable(this.document);
				context.otherItemsTable = await this.#otherItemsTable.renderTable(this.document);
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

		// Right click on character
		this.setupCharacterContextMenu(html);
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.#equipmentTable.activateListeners(this);
		this.#treasuresTable.activateListeners(this);
		this.#consumablesTable.activateListeners(this);
		this.#otherItemsTable.activateListeners(this);
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
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onAddTrack(event, target) {
		await ProgressDataModel.promptAddToDocument(this.actor, 'system.tracks', true);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRemoveTrack(event, target) {
		const index = Number(target.closest('[data-index]').dataset.index);
		return ProgressDataModel.removeAtIndexForDocument(this.actor, 'system.tracks', index);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onUpdateTrack(event, target) {
		const { updateAmount, index, alternate } = target.dataset;
		let increment = parseInt(updateAmount);
		if (alternate && event.button === 2) {
			increment = -increment;
		}
		return ProgressDataModel.updateAtIndexForDocument(this.actor, 'system.tracks', Number.parseInt(index), increment);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onPromptTrack(event, target) {
		const index = Number(target.closest('[data-index]').dataset.index);
		return ProgressDataModel.promptCheckAtIndexForDocument(this.actor, 'system.tracks', index);
	}

	async _onDropItem(event, item) {
		const itemStashed = await ActorSheetUtils.handleStashDrop(this.actor, item);
		if (itemStashed === true) {
			return [];
		}

		return super._onDropItem(event, item);
	}

	async _onDropActor(event, actor) {
		console.debug(`${actor.name} was dropped onto party sheet`);
		if (actor.type === 'character') {
			return this.party.addCharacter(actor);
		} else if (actor.type === 'npc') {
			if (actor.system.rank.value === 'companion') {
				return this.party.addCompanion(actor);
			} else {
				return this.party.addOrUpdateAdversary(actor, 0);
			}
		}
		return super._onDropActor(event, actor);
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
		const data = this.party.getAdversary(uuid);
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

	static #onCreate(event, target) {
		const type = target.dataset.type;

		if (!type) {
			return;
		}
		const itemData = {
			type: type,
		};

		itemData.name = foundry.documents.Item.defaultName({ type: type, parent: this.actor });

		foundry.documents.Item.create(itemData, { parent: this.actor });
	}

	static #onEdit(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(itemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}

		if (item) {
			item.sheet.render(true);
		}
	}

	static #onRoll(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(itemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}

		if (item) {
			return Checks.display(this.actor, item);
		}
	}

	static async #onClearInventory() {
		const clear = await foundry.applications.api.Dialog.confirm({
			content: game.i18n.format('FU.DialogDeleteItemDescription', { item: `${game.i18n.localize('FU.All')} ${game.i18n.localize('FU.Items')}` }),
			rejectClose: false,
		});
		if (clear) {
			console.debug(`Clearing all items from actor ${this.actor}`);
			return this.actor.clearEmbeddedItems();
		}
	}

	static async #onCreateEquipment() {
		const itemType = await foundry.applications.api.DialogV2.wait({
			window: { title: `${game.i18n.localize('FU.Create')} ${game.i18n.localize('FU.Item')}` },
			content: '',
			rejectClose: false,
			buttons: ['accessory', 'armor', 'shield', 'weapon'].map((choice) => ({
				action: choice,
				label: game.i18n.localize(CONFIG.Item.typeLabels[choice]),
			})),
		});

		if (itemType) {
			foundry.documents.Item.create({ type: itemType, name: foundry.documents.Item.defaultName({ type: itemType, parent: this.actor }) }, { parent: this.actor });
		}
	}

	static #onShareItem(event, target) {
		const dataItemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(dataItemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}
		if (item) {
			return InventoryPipeline.tradeItem(this.actor, item, 'loot');
		}
	}

	static #onDistributeZenit() {
		return InventoryPipeline.distributeZenit(this.actor);
	}
}

////////////////////////////////////
// HOOKS
////////////////////////////////////

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
		const adversary = party.getAdversary(event.actor.resolveUuid());
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

async function onResourceChangeEvent(event) {
	if (event.actor) {
		const party = await FUPartySheet.getActive();
		if (party && party.system.characters.has(event.actor.uuid)) {
			party.sheet.render({
				parts: ['overview'],
			});
		}
	}
}

Hooks.on(FUHooks.DAMAGE_EVENT, onResourceChangeEvent);
Hooks.on(FUHooks.GAIN_EVENT, onResourceChangeEvent);
Hooks.on(FUHooks.LOSS_EVENT, onResourceChangeEvent);
