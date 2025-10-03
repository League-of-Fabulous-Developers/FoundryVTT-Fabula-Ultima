import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { FUPartySheet } from './actor-party-sheet.mjs';
import { FUHooks } from '../hooks.mjs';

/**
 * @description Prepares model-agnostic data for the actor
 * @param {Object} context
 * @param {FUActorSheet} sheet
 * @returns {Promise<void>}
 */
async function prepareData(context, sheet) {
	// Ensure expanded state is initialized
	if (!sheet._expanded) {
		const storedExpanded = sheet.actor.system._expanded || [];
		sheet._expanded = new Set(storedExpanded);
	}
	context._expandedIds = Array.from(sheet._expanded);

	// Add the actor's data to context.data for easier access, as well as flags.
	context.actor = sheet.actor;
	if (!context.items) {
		context.items = sheet.actor.items;
	}
	context.itemCount = context.actor.items.size;
	context.system = sheet.actor.system;
	context.flags = sheet.actor.flags;
	context.isGM = game.user.isGM;
	context.isOwner = sheet.actor.isOwner;

	// Add support for formInput,formGroup
	// https://foundryvtt.wiki/en/development/api/helpers#forminput-and-formgroup
	context.document = sheet.document;
	context.fields = sheet.document.schema.fields;
	context.system = sheet.document.system;
	context.systemFields = sheet.document.system.schema.fields;
}

/**
 * @description Helper function to find the appropriate update configuration
 * @param type
 * @param subtype
 * @returns {{types: string[], subtypes: string[], update: ((function(*, *): Promise<void>)|*)} | {types: string[], update: ((function(*): Promise<void>)|*)}}
 */
function findItemConfig(type, subtype) {
	const itemTypeConfigs = [
		{
			types: ['treasure'],
			subtypes: ['artifact', 'material', 'treasure'],
			update: async (itemData, item) => {
				const incrementValue = itemData.system.quantity?.value || 1;
				const newQuantity = (item.system.quantity.value || 0) + incrementValue;
				await item.update({ 'system.quantity.value': newQuantity });
			},
		},
		{
			types: ['effect'],
			update: async (itemData) => {
				// Effects are handled separately
				return;
			},
		},
	];

	// Find the correct config that matches both type and subtype
	return itemTypeConfigs.find((config) => {
		console.log('type', type, 'subtype', subtype);
		const typeMatch = config.types.includes(type);
		const subtypeMatch = config.subtypes ? config.subtypes.includes(subtype) : true;
		return typeMatch && subtypeMatch;
	});
}

/**
 * @param {HTMLElement} html
 * @param {ActorSheet} sheet
 */
function activateDefaultListeners(html, sheet) {
	// Initialize the context menu options
	const contextMenuOptions = [
		{
			name: game.i18n.localize('FU.Edit'),
			icon: '<i class="fas fa-edit"></i>',
			callback: (html) => _onItemEdit(html, sheet),
			condition: (html) => !!html.closest('[data-item-id]'),
		},
		{
			name: game.i18n.localize('FU.Duplicate'),
			icon: '<i class="fas fa-clone"></i>',
			callback: (html) => _onItemDuplicate(html, sheet),
			condition: (html) => !!html.closest('[data-item-id]'),
		},
		{
			name: game.i18n.localize('FU.Delete'),
			icon: '<i class="fas fa-trash"></i>',
			callback: (html) => _onItemDelete(html, sheet),
			condition: (html) => !!html.closest('[data-item-id]'),
		},
	];

	if (sheet.actor.isCharacterType) {
		contextMenuOptions.push({
			name: game.i18n.localize('FU.StashItem'),
			icon: '<i class="fa fa-paper-plane"></i>',
			callback: (html) => onSendItemToPartyStash(html, sheet),
			condition: (html) => {
				const item = sheet.actor.items.get(html.closest('[data-item-id]')?.dataset?.itemId);
				return item?.canStash;
			},
		});

		contextMenuOptions.push({
			name: `${game.i18n.localize('Deactivate')} ${game.i18n.localize('FU.Behavior')}`,
			icon: `<i class="fas fa-address-book"></i>`,
			callback: (html) => _onItemBehavior(html, sheet),
			condition: (html) => {
				if (sheet.actor.type === 'npc' && game.settings.get('projectfu', 'optionBehaviorRoll')) {
					const itemId = html.closest('[data-item-id]');
					let item = sheet.actor.items.get(itemId);

					if (!item) {
						const uuid = html.closest('[data-uuid]').dataset.uuid;
						item = fromUuidSync(uuid);
					}

					return item && item.system.isBehavior && item.system.isBehavior.value;
				} else {
					return false;
				}
			},
		});

		contextMenuOptions.push({
			name: `${game.i18n.localize('Activate')} ${game.i18n.localize('FU.Behavior')}`,
			icon: `<i class="far fa-address-book"></i>`,
			callback: (html) => _onItemBehavior(html, sheet),
			condition: (html) => {
				if (sheet.actor.type === 'npc' && game.settings.get('projectfu', 'optionBehaviorRoll')) {
					const itemId = html.closest('[data-item-id]');
					let item = sheet.actor.items.get(itemId);

					if (!item) {
						const uuid = html.closest('[data-uuid]').dataset.uuid;
						item = fromUuidSync(uuid);
					}

					return item && item.system.isBehavior && !item.system.isBehavior.value;
				} else {
					return false;
				}
			},
		});
	}

	Hooks.callAll(FUHooks.ITEM_TABLE_CONTEXT_OPTIONS, contextMenuOptions, sheet, sheet.actor);

	new foundry.applications.ux.ContextMenu.implementation(html, '[data-context-menu="item"]', contextMenuOptions, {
		eventName: 'click',
		jQuery: false,
		onOpen: (menu) => {
			setTimeout(() => menu.querySelector('nav#context-menu')?.classList.add('item-options'), 1);
		},
		onClose: () => console.log('Context menu closed'),
		fixed: true,
	});
}

async function onSendItemToPartyStash(element, sheet) {
	const item = sheet.actor.items.get(element.dataset.itemId);
	const party = await FUPartySheet.getActiveModel();
	if (party) {
		return InventoryPipeline.requestTrade(sheet.actor.uuid, item.uuid, false, party.parent.uuid);
	}
}

/**
 * Handles the editing of an item.
 * @param {HTMLElement} element - The element the ContextMenu was attached to
 * @param {ActorSheet} sheet
 */
function _onItemEdit(element, sheet) {
	const itemId = element.closest('[data-item-id]')?.dataset?.itemId;
	let item = sheet.actor.items.get(itemId);
	if (!item) {
		item = foundry.utils.fromUuidSync(element.closest('[data-uuid]')?.dataset?.uuid);
	}
	if (item) item.sheet.render(true);
}

/**
 * Toggles the behavior state of the specified item.
 * @param {HTMLElement} element - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
async function _onItemBehavior(element, sheet) {
	const itemId = element.closest('[data-item-id]')?.dataset?.itemId;
	let item = sheet.actor.items.get(itemId);
	if (!item) {
		const uuid = element.closest('[data-uuid]')?.dataset?.uuid;
		item = fromUuidSync(uuid);
	}
	if (item) {
		const isBehavior = foundry.utils.getProperty(item, 'system.isBehavior.value');
		return item.update({ 'system.isBehavior.value': !isBehavior });
	}
}

/**
 * Deletes the specified item after confirming with the user.
 * @param {HTMLElement} element - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
async function _onItemDelete(element, sheet) {
	const itemId = element.closest('[data-item-id]')?.dataset?.itemId;
	let item = sheet.actor.items.get(itemId);

	if (!item) {
		const uuid = element.closest('[data-uuid]')?.dataset?.uuid;
		item = foundry.utils.fromUuidSync(uuid);
	}

	if (!item) {
		return;
	}

	if (
		await foundry.applications.api.DialogV2.confirm({
			window: { title: game.i18n.format('FU.DialogDeleteItemTitle', { item: item.name }) },
			content: game.i18n.format('FU.DialogDeleteItemDescription', { item: item.name }),
			rejectClose: false,
		})
	) {
		await item.delete();
		sheet.render(false); // Removed `jq.slideUp` since it's jQuery-specific
	}
}

/**
 * Duplicates the specified item and adds it to the actor's item list.
 * @param {HTMLElement} element - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
async function _onItemDuplicate(element, sheet) {
	const itemId = element.dataset.itemId;
	let item = sheet.actor.items.get(itemId);
	if (!item) {
		item = foundry.utils.fromUuidSync(element.closest('[data-uuid]')?.dataset?.uuid);
	}
	if (item) {
		const dupData = item.toObject(true);
		dupData.name += ` (${game.i18n.localize('FU.Copy')})`;
		await sheet.actor.createEmbeddedDocuments('Item', [dupData]);
		sheet.render();
	}
}

/**
 * @param actor
 * @param item
 * @returns {Promise<Boolean>}
 */
async function handleStashDrop(actor, item) {
	/** @type FUItem **/
	if (item.canStash) {
		const existingItem = actor.items.find((i) => i.name === item.name && i.type === item.type);
		if (existingItem) {
			const subtype = item.system.subtype?.value;
			const config = findItemConfig(item.type, subtype);
			if (config) {
				await config.update(item, existingItem);
				console.debug(`${item.name} was appended onto ${actor.name}`);
				return true;
			}
		}
	}
}

/**
 * Organize and classify Items for Character sheets.
 * @param {Object} context
 */
function prepareCharacterData(context) {
	if (!context || !context.system || !context.system.attributes || !context.system.affinities) {
		console.error('Invalid context or context.system');
		return;
	}

	// Handle ability scores.
	for (let [k, v] of Object.entries(context.system.attributes)) {
		v.label = game.i18n.localize(CONFIG.FU.attributes[k]) ?? k;
		v.abbr = game.i18n.localize(CONFIG.FU.attributeAbbreviations[k]) ?? k;
	}

	// Handle affinity
	for (let [k, v] of Object.entries(context.system.affinities)) {
		v.label = game.i18n.localize(CONFIG.FU.damageTypes[k]) ?? k;
		v.affTypeBase = game.i18n.localize(CONFIG.FU.affType[v.base]) ?? v.base;
		v.affTypeBaseAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.base]) ?? v.base;
		v.affTypeCurr = game.i18n.localize(CONFIG.FU.affType[v.current]) ?? v.current;
		v.affTypeCurrAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.current]) ?? v.current;
		v.icon = CONFIG.FU.affIcon[k];
	}

	// Handle immunity
	for (let [k, v] of Object.entries(context.system.immunities)) {
		v.label = game.i18n.localize(CONFIG.FU.temporaryEffects[k]) ?? k;
	}
}

function prepareNpcCompanionData(context) {
	if (context.actor.system.rank.value === 'companion' || context.actor.system.rank.value === 'custom') {
		// Populate the dropdown with owned actors
		context.ownedActors = game.actors.filter((a) => a.type === 'character' && a.testUserPermission(game.user, 'OWNER'));

		// Check if a refActor is selected
		const refActor = context.system.references.actor;
		context.refActorLevel = refActor ? refActor.system.level.value : 0;

		if (refActor) {
			// Filter skills associated with the refActor
			context.availableSkills = refActor.items.filter((item) => item.type === 'skill');

			// Retrieve the selected referenceSkill by UUID
			context.refSkill = context.system.references.skill ? context.availableSkills.find((skill) => skill.uuid === context.system.references.skill) : null;
			context.refSkillLevel = context.refSkill ? context.refSkill.system.level.value || 0 : 0;
		} else {
			// No referencePlayer selected, clear skills and selected skill
			context.availableSkills = [];
			context.refSkill = null;
			context.refSkillLevel = 0;
		}
	}
}

function onRenderFUActorSheet(sheet, element) {
	// Automatically expand elements that are in the _expanded state
	if (sheet._expanded) {
		sheet._expanded.forEach((itemId) => {
			const expandedDescriptions = element.querySelectorAll(`li[data-item-id="${itemId}"] .individual-description`);
			console.log(itemId, expandedDescriptions);
			expandedDescriptions.forEach((el) => {
				el.classList.remove('hidden');
				el.style.display = 'block';
				el.style.height = 'auto';
			});
		});
	}
}

Hooks.on('renderFUActorSheet', onRenderFUActorSheet);

/**
 * @description Provides utility functions for rendering the actor sheet
 */
export const ActorSheetUtils = Object.freeze({
	prepareData,
	findItemConfig,
	prepareCharacterData,
	activateDefaultListeners,
	handleStashDrop,
	prepareNpcCompanionData,
});
