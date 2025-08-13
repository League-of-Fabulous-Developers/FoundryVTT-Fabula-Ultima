import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { FUPartySheet } from './actor-party-sheet.mjs';
import { getPrioritizedUserTargeted } from '../helpers/target-handler.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';

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

const CLOCK_TYPES = ['zeroPower', 'ritual', 'miscAbility', 'rule'];
const RESOURCE_POINT_TYPES = ['miscAbility', 'skill', 'heroic'];
const WEARABLE_TYPES = ['armor', 'shield', 'accessory'];

/**
 * @description Organize and classify Items for Character sheets.
 * @param {Object} context The actor to prepare.
 */
async function prepareItems(context) {
	// TODO: Handle elsewhere
	// Iterate through items, allocating to containers
	for (let item of context.items) {
		if (CLOCK_TYPES.includes(item.type)) {
			const progressArr = [];
			const progress = item.system.progress || { current: 0, max: 6 };
			for (let i = 0; i < progress.max; i++) {
				progressArr.push({
					id: i + 1,
					checked: parseInt(progress.current) === i + 1,
				});
			}
			item.progressArr = progressArr.reverse();
		}
		if (RESOURCE_POINT_TYPES.includes(item.type)) {
			const rpArr = [];
			const rp = item.system.rp || { current: 0, max: 6 };
			for (let i = 0; i < rp.max; i++) {
				rpArr.push({
					id: i + 1,
					checked: parseInt(rp.current) === i + 1,
				});
			}
			item.rpArr = rpArr.reverse();
		}
		if (WEARABLE_TYPES.includes(item.type)) {
			item.def = item.isMartial && item.type === 'armor' ? item.system.def.value : `+${item.system.def.value}`;
			item.mdef = `+${item.system.mdef.value}`;
			item.init = item.system.init.value > 0 ? `+${item.system.init.value}` : item.system.init.value;
		}
	}
}

/**
 * @param {Object} context
 * @returns {Promise<void>}
 */
async function enrichItems(context) {
	for (let item of context.items) {
		await enrichItemDescription(item);
	}
}

/**
 * @param {FUItem} item
 * @returns {Promise<void>}
 */
async function enrichItemDescription(item) {
	item.enrichedHtml = {
		description: await TextEditor.enrichHTML(item.system?.description ?? ''),
	};
}

/**
 * @param {ApplicationRenderContext} context
 */
function prepareAbilities(context) {
	const abilities = [];
	for (let item of context.items) {
		if (item.type === 'miscAbility') {
			const skillData = getSkillDisplayData(item);
			item.quality = skillData.qualityString;
			abilities.push(item);
		}
	}
	context.abilities = abilities;
}

/**
 * @param {ApplicationRenderContext} context
 */
function prepareNpcCombat(context) {
	const basics = [];
	const rules = [];
	const treasures = [];

	for (let item of context.items) {
		switch (item.type) {
			case 'basic':
				{
					const weapData = getWeaponDisplayData(context.actor, item);
					item.quality = weapData.qualityString;
					item.detail = weapData.detailString;
					item.attackString = weapData.attackString;
					item.damageString = weapData.damageString;
					basics.push(item);
				}
				break;

			case 'rule':
				rules.push(item);
				break;

			case 'treasure':
				treasures.push(item);
				break;
		}
	}

	context.basics = basics;
	context.rules = rules;
	context.treasures = treasures;
}

/**
 * @param {ApplicationRenderContext} context
 */
function prepareInventory(context) {
	const weapons = [];
	const armor = [];
	const shields = [];
	const accessories = [];
	const consumables = [];
	const treasures = [];

	for (let item of context.items) {
		switch (item.type) {
			case 'armor':
				armor.push(item);
				break;

			case 'shield':
				{
					const weaponData = getWeaponDisplayData(context.actor, item);
					item.quality = weaponData.qualityString;
					item.detail = weaponData.detailString;
					item.attackString = weaponData.attackString;
					item.damageString = weaponData.damageString;
					shields.push(item);
				}
				break;

			case 'accessory':
				accessories.push(item);
				break;

			case 'weapon':
				{
					item.unarmedStrike = context.actor.getSingleItemByFuid('unarmed-strike');
					const weaponData = getWeaponDisplayData(context.actor, item);
					item.quality = weaponData.qualityString;
					item.detail = weaponData.detailString;
					item.attackString = weaponData.attackString;
					item.damageString = weaponData.damageString;
					weapons.push(item);
				}
				break;

			case 'treasure':
				{
					const itemData = getItemDisplayData(item);
					item.quality = itemData.qualityString;
					treasures.push(item);
				}
				break;

			case 'consumable':
				{
					const itemData = getItemDisplayData(item);
					item.quality = itemData.qualityString;
					consumables.push(item);
				}
				break;
		}
	}

	context.weapons = weapons;
	context.armor = armor;
	context.shields = shields;
	context.accessories = accessories;
	context.consumables = consumables;
	context.treasures = treasures;
	context.equipment = [...weapons, ...armor, ...shields, ...accessories];
}

/**
 * @param {ApplicationRenderContext} context
 */
function prepareProjects(context) {
	const projects = [];
	for (let item of context.items) {
		if (item.type === 'project') {
			item.cost = item.system.cost?.value;
			item.discount = item.system.discount?.value;
			item.progressMax = item.system.progress?.max;
			item.progressPerDay = item.system.progressPerDay?.value;
			item.days = item.system.days?.value;
			item.progressCurr = item.system.progress?.current;
			item.progressStep = item.system.progress?.step;
			item.defect = !!item.system.isDefect?.value;
			item.defectMod = item.system.use?.value;
			item.use = item.system.use?.value;
			projects.push(item);
		}
	}
	context.projects = projects;
}

/**
 * @param {ApplicationRenderContext} context
 */
async function prepareFeatures(context) {
	context.classFeatures = {};
	for (const item of context.actor.itemTypes.classFeature) {
		const featureType = (context.classFeatures[item.system.featureType] ??= {
			feature: item.system.data?.constructor,
			items: {},
		});
		featureType.items[item.id] = {
			item,
			additionalData: await featureType.feature?.getAdditionalData(item.system.data),
		};
	}

	context.optionalFeatures = {};
	for (const item of context.actor.itemTypes.optionalFeature) {
		const optionalType = (context.optionalFeatures[item.system.optionalType] ??= {
			optional: item.system.data?.constructor,
			items: {},
		});
		optionalType.items[item.id] = {
			item,
			additionalData: await optionalType.optional?.getAdditionalData(item.system.data),
		};

		// Feature Clocks
		const relevantTypes = ['optionalFeature'];

		if (relevantTypes.includes(item.type)) {
			const progressArr = [];
			const progress = item.system.data.progress || { current: 0, max: 6 };

			for (let i = 0; i < progress.max; i++) {
				progressArr.push({
					id: i + 1,
					checked: parseInt(progress.current) === i + 1,
				});
			}

			item.progressArr = progressArr.reverse();
		}
	}
}

/**
 * @param {ApplicationRenderContext} context
 */
async function prepareSpells(context) {
	const spells = [];
	const rituals = [];

	// Iterate through items, allocating to containers
	for (let item of context.items) {
		switch (item.type) {
			case 'spell':
				{
					const spellData = getSpellDisplayData(context.actor, item);
					item.quality = spellData.qualityString;
					item.detail = spellData.detailString;
					item.attackString = spellData.attackString;
					item.damageString = spellData.damageString;
					spells.push(item);
				}
				break;

			case 'ritual':
				{
					item.mpCost = item.system.mpCost?.value;
					item.dLevel = item.system.dLevel?.value;
					item.clock = item.system.clock?.value;
					item.potency = item.system.potency?.value;
					item.area = item.system.area?.value;
					rituals.push(item);
				}
				break;
		}
	}

	context.spells = spells;
	context.rituals = rituals;
}

/**
 * @param {ApplicationRenderContext} context
 */
function prepareClasses(context) {
	const classes = [];
	const skills = [];
	const heroics = [];

	// Iterate through items, allocating to containers
	for (let item of context.items) {
		switch (item.type) {
			case 'class':
				classes.push(item);
				break;

			case 'skill':
				{
					const skillData = getSkillDisplayData(item);
					item.quality = skillData.qualityString;
					skills.push(item);

					const skillArr = [];
					const level = item.system.level || { value: 0, max: 8 };
					for (let i = 0; i < level.max; i++) {
						skillArr.push({
							id: i + 1,
							checked: parseInt(level.value) === i + 1,
						});
					}
					item.skillArr = skillArr;
				}
				break;

			case 'heroic':
				heroics.push(item);
				break;
		}
	}

	context.classes = classes;
	context.skills = skills;
	context.heroics = heroics;
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
 * @description  the display data for a weapon item.
 * @property {FUActor} actor
 * @property {FUItem} item
 * @returns {object|boolean} An object containing weapon display information, or false if item is not a weapon.
 */
function getWeaponDisplayData(actor, item) {
	const isWeapon = item.type === 'weapon';
	const isBasic = item.type === 'basic';
	// Check if this item is not a weapon or not a weapon/shield with dual
	if (!isBasic && !isWeapon) {
		return false;
	}

	function translate(string) {
		const allTranslations = Object.assign({}, CONFIG.FU.handedness, CONFIG.FU.weaponCategories, CONFIG.FU.weaponTypes, CONFIG.FU.attributeAbbreviations, CONFIG.FU.damageTypes);
		if (string?.includes('.') && CONFIG.FU.defenses[string.split('.')[0]]) {
			const [category, subkey] = string.split('.');
			return game.i18n.localize(CONFIG.FU.defenses[category]?.[subkey] ?? string);
		}

		return game.i18n.localize(allTranslations?.[string] ?? string);
	}

	const hrZeroText = item.system.rollInfo?.useWeapon?.hrZero?.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;
	const qualText = item.system.quality?.value || '';
	let qualityString = '';
	let detailString = '';

	const primaryAttribute = item.system.attributes?.primary?.value;
	const secondaryAttribute = item.system.attributes?.secondary?.value;

	const attackAttributes = [translate(primaryAttribute || '').toUpperCase(), translate(secondaryAttribute || '').toUpperCase()].join(' + ');

	const accuracyValue = item.system.accuracy?.value ?? 0;

	let accuracyGlobalValue = 0;
	let damageGlobalValue = 0;

	if (actor.isCharacterType) {
		accuracyGlobalValue = actor.system.bonuses.accuracy?.accuracyCheck ?? 0;
		const weaponType = item.system.type?.value;
		if (weaponType === 'melee') {
			damageGlobalValue = actor.system.bonuses.damage?.melee ?? 0;
		} else if (weaponType === 'ranged') {
			damageGlobalValue = actor.system.bonuses.damage?.ranged ?? 0;
		}
	}

	const accuracyTotal = accuracyValue + accuracyGlobalValue;

	const defenseString = item.system?.defense ? translate(`${item.system.defense}.abbr`) : '';
	const damageValue = item.system.damage?.value ?? 0;
	const damageTotal = damageValue + damageGlobalValue;

	const attackString = `【${attackAttributes}】${accuracyTotal > 0 ? ` +${accuracyTotal}` : ''}`;

	const damageTypeValue = translate(item.system.damageType?.value || '');

	const damageString = `【${hrZeroText} ${damageTotal}】 ${damageTypeValue}`;

	if (isWeapon) {
		detailString = [attackString, damageString].filter(Boolean).join('⬥');
		qualityString = [translate(item.system.category?.value), translate(item.system.hands?.value), translate(item.system.type?.value), defenseString, qualText].filter(Boolean).join(' ⬥ ');
	} else if (isBasic) {
		detailString = [attackString, damageString].filter(Boolean).join('⬥');
		qualityString = [translate(item.system.type?.value), defenseString, qualText].filter(Boolean).join(' ⬥ ');
	}

	return {
		attackString,
		damageString,
		detailString: `${detailString}`,
		qualityString: `${qualityString}`,
	};
}

/**
 * Get the display data for an item.
 * @returns {object|boolean} An object containing item display information, or false if this is not an item.
 * @property {string} qualityString - The item's summary.
 */
function getItemDisplayData(item) {
	const relevantTypes = ['consumable', 'treasure', 'rule'];
	if (!relevantTypes.includes(item.type)) {
		return false;
	}

	// Retrieve and process the item's summary
	const summary = item.system.summary.value?.trim() || '';
	let qualityString = game.i18n.localize('FU.SummaryNone');

	// Parse the summary if it exists and is not empty
	if (summary) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(summary, 'text/html');
		qualityString = doc.body.textContent || game.i18n.localize('FU.SummaryNone');
	}

	return {
		qualityString,
	};
}

/**
 * @description  the display data for an item.
 * @param {FUItem} item
 * @returns {object|boolean} An object containing skill display information, or false if this is not a skill.
 */
function getSkillDisplayData(item) {
	// Check if this item is not a skill
	if (item.type !== 'skill' && item.type !== 'miscAbility') {
		return false;
	}

	function translate(string) {
		const allTranslations = Object.assign({}, CONFIG.FU.attributeAbbreviations, CONFIG.FU.damageTypes);

		return game.i18n.localize(allTranslations?.[string] ?? string);
	}

	// Get the equipped item IDs from the actor's system
	const equipped = item.actor.system.equipped || {};
	const mainHandId = equipped.mainHand;

	// Find the main hand weapon by its ID
	let weaponMain = mainHandId ? item.actor.items.get(mainHandId) : null;

	const hasRoll = item.system.hasRoll?.value;
	const hasDamage = item.system.rollInfo?.damage?.hasDamage.value;
	const usesWeapons = item.system.rollInfo?.useWeapon?.accuracy.value;
	const usesWeaponsDamage = item.system.rollInfo?.useWeapon?.damage.value;
	const hrZeroText = item.system.rollInfo?.useWeapon?.hrZero.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;

	let attackWeaponAttributes, attackAttributes;
	if (usesWeapons && weaponMain) {
		attackWeaponAttributes = [translate(weaponMain?.system?.attributes?.primary.value).toUpperCase(), translate(weaponMain?.system?.attributes?.secondary.value).toUpperCase()].join(' + ');
	} else {
		attackWeaponAttributes = '';
	}

	if (hasRoll) {
		attackAttributes = [translate(item.system?.rollInfo?.attributes?.primary.value).toUpperCase(), translate(item.system?.rollInfo?.attributes?.secondary.value).toUpperCase()].join(' + ');
	}

	const weaponString = usesWeapons ? (weaponMain ? weaponMain?.name : game.i18n.localize('FU.AbilityNoWeaponEquipped')) : '';

	let attackString = '';
	if (hasRoll || usesWeapons) {
		attackString = usesWeapons
			? `【${attackWeaponAttributes}】${weaponMain ? (weaponMain?.system?.accuracy?.value > 0 ? ` + ${weaponMain?.system?.accuracy?.value}` : '') : ''}`
			: `【${attackAttributes}】${item.system?.rollInfo?.accuracy?.value > 0 ? ` + ${item.system?.rollInfo?.accuracy?.value}` : ''}`;
	}

	let damageString = '';
	if (hasDamage || usesWeaponsDamage) {
		damageString = usesWeapons
			? `【${hrZeroText} ${weaponMain ? `${weaponMain?.system?.damage.value}】 ${translate(weaponMain?.system?.damageType.value)}` : ''}`
			: `【${hrZeroText} ${item.system?.rollInfo?.damage?.value > 0 ? ` ${item.system?.rollInfo?.damage?.value}` : '0'} 】${translate(item.system?.rollInfo?.damage.type.value)}`;
	}

	const qualityString = [StringUtils.capitalize(item.system?.class?.value), weaponString, attackString, damageString].filter(Boolean).join(' ⬥ ');

	const starCurrent = item.system?.level?.value;
	const starMax = item.system?.level?.max;

	return {
		qualityString: `${qualityString}`,
		starCurrent: `${starCurrent}`,
		starMax: `${starMax}`,
	};
}

/**
 * @typedef SpellDisplayData
 * @property {string} attackString - The spell's attack description.
 * @property {string} damageString - The spell's damage description.
 * @property {string} detailString - The combined attack and damage descriptions.
 * @property {string} qualityString - The spell's quality description.
 **/

/**
 * @description Retrieves the display data for a spell item. *
 * @returns {SpellDisplayData|boolean} An object containing spell display information, or false if this is not a spell.
 */
function getSpellDisplayData(actor, item) {
	if (item.type !== 'spell') {
		return false;
	}

	// Define constants and variables
	const hrZeroText = item.system.rollInfo?.useWeapon?.hrZero?.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;

	const attackAttributes = [item.system.rollInfo?.attributes?.primary.value.toUpperCase(), item.system.rollInfo?.attributes?.secondary.value.toUpperCase()].join(' + ');

	const attackString = item.system.hasRoll.value ? `【${attackAttributes}${item.system.rollInfo.accuracy.value > 0 ? ` +${item.system.rollInfo.accuracy.value}` : ''}】` : '';

	const damageString = item.system.rollInfo.damage.hasDamage.value ? `【${hrZeroText} ${item.system.rollInfo.damage.value}】 ${item.system.rollInfo.damage.type.value}` : '';

	const qualText = item.system.quality?.value || '';
	const detailString = [attackString, damageString].filter(Boolean).join('⬥');
	const qualityString = [StringUtils.capitalize(item.system.cost.amount), StringUtils.capitalize(item.system.targeting.rule), StringUtils.capitalize(item.system.duration.value), qualText].filter(Boolean).join(' ⬥ ');

	return {
		attackString,
		damageString,
		detailString,
		qualityString,
	};
}

/**
 * @param {HTMLElement} html
 * @param {ActorSheet} sheet
 */
function activateDefaultListeners(html, sheet) {
	// Click to edit item
	html.addEventListener('click', (ev) => {
		const target = ev.target.closest('.item-edit');
		if (target) {
			_onItemEdit(target, sheet);
		}
	});

	// Initialize the context menu options
	const contextMenuOptions = [
		{
			name: game.i18n.localize('FU.Edit'),
			icon: '<i class="fas fa-edit"></i>',
			callback: (html) => _onItemEdit(html, sheet),
			condition: (html) => !!html.dataset.itemId,
		},
		{
			name: game.i18n.localize('FU.Duplicate'),
			icon: '<i class="fas fa-clone"></i>',
			callback: (html) => _onItemDuplicate(html, sheet),
			condition: (html) => !!html.dataset.itemId,
		},
		{
			name: game.i18n.localize('FU.Delete'),
			icon: '<i class="fas fa-trash"></i>',
			callback: (html) => _onItemDelete(html, sheet),
			condition: (html) => !!html.dataset.itemId,
		},
	];

	if (sheet.actor.isCharacterType) {
		contextMenuOptions.push({
			name: game.i18n.localize('FU.StashItem'),
			icon: '<i class="fa fa-paper-plane"></i>',
			callback: (html) => onSendItemToPartyStash(html, sheet),
			condition: (html) => {
				const item = sheet.actor.items.get(html.dataset.itemId);
				return item?.canStash;
			},
		});
	}

	html.addEventListener('click', (event) => {
		// Ensure the target is an item-option
		if (event.target.closest('.item-option')) {
			const itemId = event.target.closest('.item-option').dataset.itemId;

			// Check for the Behavior option before adding it
			const behaviorOptionExists = contextMenuOptions.some((option) => option.name === game.i18n.localize('FU.Behavior'));
			if (sheet.actor.type === 'npc' && game.settings.get('projectfu', 'optionBehaviorRoll') && !behaviorOptionExists) {
				const item = sheet.actor.items.get(itemId);

				if (item?.system?.isBehavior) {
					const behaviorClass = item.system.isBehavior.value ? 'fas active' : 'far';

					contextMenuOptions.push({
						name: game.i18n.localize('FU.Behavior'),
						icon: `<i class="${behaviorClass} fa-address-book"></i>`,
						callback: (html) => _onItemBehavior(html, sheet),
						condition: (html) => !!html.dataset.itemid,
					});
				}
			}
		}
	});

	new foundry.applications.ux.ContextMenu.implementation(html, '.item-option', contextMenuOptions, {
		eventName: 'click',
		jQuery: false,
		onOpen: (menu) => {
			setTimeout(() => menu.querySelector('nav#context-menu')?.classList.add('item-options'), 1);
		},
		onClose: () => console.log('Context menu closed'),
	});

	// Toggle Expandable Item Description
	activateExpandedItemListener(html, sheet._expanded, () => _saveExpandedState(sheet));

	// Drag events
	if (sheet.actor.isOwner) {
		let handler = (ev) => sheet._onDragStart(ev);
		const items = html.querySelectorAll('li.item');
		items.forEach((li) => {
			if (li.classList.contains('inventory-header')) return;
			li.setAttribute('draggable', true);
			li.addEventListener('dragstart', handler, false);
		});
	}
}

function activateExpandedItemListener(html, expanded, onExpand) {
	html.addEventListener('click', (ev) => {
		const el = ev.target.closest('.click-item');
		if (!el) return; // Ensures we only proceed if the target is .click-item

		const parentEl = el.closest('li');
		// Support both items and effects
		const itemId = parentEl.dataset.itemId ?? parentEl.dataset.effectId;
		const desc = parentEl.querySelector('.individual-description');

		if (expanded.has(itemId)) {
			// Slide up effect
			desc.style.transition = 'height 0.2s ease';
			desc.style.height = desc.scrollHeight + 'px';
			setTimeout(() => {
				desc.style.height = '0';
			});
			setTimeout(() => {
				desc.style.display = 'none';
				desc.classList.add('hidden'); // Add hidden class after transition
				expanded.delete(itemId);
			}, 200); // After transition completes, hide it
		} else {
			// Slide down effect
			desc.classList.remove('hidden'); // Remove hidden class immediately
			desc.style.display = 'block';
			const initialHeight = desc.scrollHeight + 'px'; // Get the natural height
			desc.style.height = '0';
			setTimeout(() => {
				desc.style.transition = 'height 0.2s ease';
				desc.style.height = initialHeight; // Slide to the full height
			}, 10); // Small delay to apply height animation
			expanded.add(itemId);
		}

		if (onExpand) {
			onExpand();
		}
	});
}

function _saveExpandedState(sheet) {
	sheet.actor.update({ 'system._expanded': Array.from(sheet._expanded) });
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
	const itemId = element.dataset.itemId;
	const item = sheet.actor.items.get(itemId);
	if (item) item.sheet.render(true);
}

/**
 * Toggles the behavior state of the specified item.
 * @param {HTMLElement} element - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
async function _onItemBehavior(element, sheet) {
	const itemId = element.dataset.itemId;
	const item = sheet.actor.items.get(itemId);
	const isBehaviorBool = item.system.isBehavior.value;
	await sheet.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isBehavior.value': !isBehaviorBool }]);
}

/**
 * Deletes the specified item after confirming with the user.
 * @param {HTMLElement} element - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
async function _onItemDelete(element, sheet) {
	const itemId = element.dataset.itemId;
	const item = sheet.actor.items.get(itemId);

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
	const item = sheet.actor.items.get(itemId);
	if (item) {
		const dupData = foundry.utils.duplicate(item);
		dupData.name += ` (${game.i18n.localize('FU.Copy')})`;
		await sheet.actor.createEmbeddedDocuments('Item', [dupData]);
		sheet.render();
	}
}

/**
 * @param {HTMLElement} html
 * @param {ActorSheet} sheet
 */
function activateInventoryListeners(html, sheet) {
	// General click handler for delegated events
	html.addEventListener('click', (ev) => {
		const target = ev.target;

		// Check for a data action
		const dataAction = ev.target.parentElement.dataset.action;
		switch (dataAction) {
			case 'clearInventory':
				console.debug(`Clearing all items from actor ${sheet.actor}`);
				sheet.actor.clearEmbeddedItems();
				return;
		}

		// Check for classes
		if (target.closest('.item-create')) {
			_onItemCreate(ev, sheet);
		} else if (target.closest('.item-create-dialog')) {
			_onItemCreateDialog(ev, sheet);
		} else if (target.closest('.item-sell')) {
			onTradeItem(target.closest('.item-sell'), sheet, true);
		} else if (target.closest('.item-share')) {
			onTradeItem(target.closest('.item-share'), sheet, false);
		} else if (target.closest('.item-loot')) {
			onLootItem(target.closest('.item-loot'), sheet, false);
		} else if (target.closest('.zenit-distribute')) {
			InventoryPipeline.distributeZenit(sheet.actor);
		} else if (target.closest('.recharge-ip')) {
			InventoryPipeline.requestRecharge(sheet.actor);
		}
	});
}

const getModifiers = (event) => ({
	shift: event?.shiftKey ?? false,
	ctrl: event?.ctrlKey ?? false,
	alt: event?.altKey ?? false,
	meta: event?.metaKey ?? false,
});

/**
 * Handles the selling of items
 * @param {HTMLElement} el - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 * @param {Boolean} sell
 */
function onLootItem(el, sheet, sell) {
	const dataItemId = el.dataset.itemId;
	const sourceActor = sheet.actor;
	const item = sourceActor.items.get(dataItemId);
	if (!item) return;

	const targetActor = getPrioritizedUserTargeted();
	if (!targetActor) return;

	const modifiers = getModifiers(event);
	InventoryPipeline.requestTrade(sourceActor.uuid, item.uuid, false, targetActor.uuid, modifiers);
}

/**
 * Handles looting item directly from a sheet
 * @param {HTMLElement} el - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 * @param {Boolean} sell
 */
function onTradeItem(el, sheet, sell) {
	const dataItemId = el.dataset.itemId;
	const item = sheet.actor.items.get(dataItemId);
	if (item) {
		InventoryPipeline.tradeItem(sheet.actor, item, sell);
	}
}

/**
 * @description Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
 * @param {Event} ev   The originating click event
 * @param {ActorSheet} sheet
 * @private
 */
async function _onItemCreate(ev, sheet) {
	ev.preventDefault();
	const header = ev.target;
	// Get the type of item to create.
	const type = header.dataset.type;
	// Grab any data associated with this control.
	const data = foundry.utils.duplicate(header.dataset);
	// Initialize a default name.
	let localizedKey;
	if (type === 'classFeature') {
		localizedKey = FU.classFeatureRegistry.byKey(data.featureType)?.translation ?? CONFIG.FU.itemTypes[type];
	} else if (type === 'optionalFeature') {
		localizedKey = FU.optionalFeatureRegistry.byKey(data.optionalType)?.translation ?? CONFIG.FU.itemTypes[type];
	} else {
		localizedKey = CONFIG.FU.itemTypes[type] || `TYPES.Item.${type}`;
	}
	const name = game.i18n.localize(localizedKey);
	// Prepare the item object.
	const itemData = {
		name: name,
		type: type,
		system: data,
	};
	// Remove the type from the dataset since it's in the itemData.type prop.
	delete itemData.system['type'];

	// Check if the game option exists and is enabled
	if (game.settings.get('projectfu', 'optionAlwaysFavorite') && sheet.actor.isCharacterType) {
		let item = await Item.create(itemData, { parent: sheet.actor });
		const isV12OrLater = foundry.utils.isNewerVersion(game.version, '12.0.0');
		await item.update({
			[`${isV12OrLater ? 'system' : 'data'}.isFavored.value`]: true,
		});
		return item;
	} else {
		// Finally, create the item!
		return await Item.create(itemData, { parent: sheet.actor });
	}
}

async function _onItemCreateDialog(ev, sheet) {
	ev.preventDefault();

	const target = HTMLUtils.findWithDataset(ev.target);
	const dataset = target.dataset;
	const dataType = dataset.type; // ?? ev.srcElement.dataset.type;
	let types;
	let clock = false;

	// Get all available item types and class feature types
	const allItemTypes = Object.keys(CONFIG.Item.dataModels);
	const isCharacter = sheet.actor.type === 'character';
	const isNPC = sheet.actor.type === 'npc';
	const optionalFeatureTypes = Object.entries(CONFIG.FU.optionalFeatureRegistry.all);
	switch (dataType) {
		case 'newClock': {
			clock = true;

			types = allItemTypes.map((type) => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));
			if (isCharacter) {
				types = types.filter((item) => ['miscAbility', 'ritual'].includes(item.type));
				// Check if the optionZeroPower setting is false, then add the zeroPower feature
				if (FU.optionalFeatures.zeroPower) {
					types.push({
						type: 'optionalFeature',
						subtype: FU.optionalFeatures.zeroPower,
						label: game.i18n.localize('Zero Power'),
					});
				}
			} else if (isNPC) {
				types = types.filter((item) => ['miscAbility', 'rule'].includes(item.type));
			}
			break;
		}
		case 'newFavorite': {
			types = allItemTypes.map((type) => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));

			if (isCharacter) {
				// Filter out item type
				let dontShowCharacter = ['rule', 'behavior', 'basic', 'effect']; // Default types to hide for characters
				// Filter out default types to hide for characters
				types = types.filter((item) => !dontShowCharacter.includes(item.type));

				// Optional Features
				let optionalFeatures = optionalFeatureTypes.map(([key, optional]) => ({
					type: 'optionalFeature',
					subtype: key,
					label: game.i18n.localize(optional.translation),
				}));

				// Push filtered optional features to types array
				types.push(...optionalFeatures);
			} else if (isNPC) {
				let dontShowNPC = ['class', 'classFeature', 'optionalFeature', 'skill', 'heroic', 'project', 'ritual', 'consumable', 'effect']; // Default types to hide for NPCs
				if (!game.settings.get(SYSTEM, SETTINGS.optionBehaviorRoll)) dontShowNPC.push('behavior');
				// Filter out default types to hide for NPCs
				types = types.filter((item) => !dontShowNPC.includes(item.type));
			}
			break;
		}
		case 'newClassFeatures': {
			const classFeatureTypes = Object.entries(CONFIG.FU.classFeatureRegistry.all);
			types = ['miscAbility', 'project'];
			// Filter out item type
			types = types.map((type) => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));
			// Class Features
			types.push(
				...classFeatureTypes.map(([key, feature]) => ({
					type: 'classFeature',
					subtype: key,
					label: game.i18n.localize(feature.translation),
				})),
			);

			// Push filtered types to the types array
			types.push(
				...optionalFeatureTypes.map(([key, optional]) => ({
					type: 'optionalFeature',
					subtype: key,
					label: game.i18n.localize(optional.translation),
				})),
			);
			break;
		}
		default:
			break;
	}

	const buttons = types.map((item) => {
		let label = item.label ?? (item.subtype ? item.subtype.split('.')[1] : item.type);
		return {
			action: label,
			label: label,
			callback: () => _createItem(item.type, clock, item.subtype, sheet),
		};
	});

	console.log(buttons);

	await new foundry.applications.api.DialogV2({
		window: { title: 'Select Item Type' },
		content: `<p>Select the type of item you want to create:</p>`,
		buttons: buttons,
	}).render(true);
}

async function _createItem(type, clock, subtype, sheet) {
	let localizedKey;
	if (type === 'classFeature') {
		localizedKey = FU.classFeatureRegistry.byKey(subtype)?.translation ?? CONFIG.FU.itemTypes[type];
	} else if (type === 'optionalFeature') {
		localizedKey = FU.optionalFeatureRegistry.byKey(subtype)?.translation ?? CONFIG.FU.itemTypes[type];
	} else {
		localizedKey = CONFIG.FU.itemTypes[type] || `TYPES.Item.${type}`;
	}
	const name = game.i18n.localize(localizedKey);

	const isV12OrLater = foundry.utils.isNewerVersion(game.version, '12.0.0');
	const itemData = {
		name: name,
		type: type,
		[isV12OrLater ? 'system' : 'data']: { isFavored: true, ...(clock && { hasClock: true }), ...(subtype && { featureType: subtype }), ...(subtype && { optionalType: subtype }) },
	};

	try {
		let item = await Item.create(itemData, { parent: sheet.actor });

		await item.update({
			[`${isV12OrLater ? 'system' : 'data'}.hasClock.value`]: clock,
			[`${isV12OrLater ? 'system' : 'data'}.isFavored.value`]: true,
			[`${isV12OrLater ? 'system' : 'data'}.featureType`]: subtype,
			[`${isV12OrLater ? 'system' : 'data'}.optionalType`]: subtype,
		});
		ui.notifications.info(`${name} created successfully.`);
		item.sheet.render(true);
		return item;
	} catch (error) {
		console.error(`Error creating/updating item: ${error.message}`);
		ui.notifications.error(`Error creating ${name}: ${error.message}`);
	}
}

/**
 * @param actor
 * @param data
 * @param {Promise<*>} onNewItem
 * @returns {Promise<Boolean>}
 */
async function handleInventoryItemDrop(actor, data, onNewItem) {
	/** @type FUItem **/
	const item = await Item.implementation.fromDropData(data);
	if (item.canStash) {
		const existingItem = actor.items.find((i) => i.name === item.name && i.type === item.type);
		let incremented = false;
		if (existingItem) {
			const subtype = item.system.subtype?.value;
			const config = findItemConfig(item.type, subtype);
			if (config) {
				await config.update(item, existingItem);
				console.debug(`${item.name} was appended onto ${actor.name}`);
				incremented = true;
			}
		}
		if (!incremented) {
			await onNewItem;
		}
		return true;
	}
	return false;
}

/**
 * @param {HTMLElement} html
 * @param {ActorSheet} sheet
 */
function activateStashListeners(html, sheet) {
	const rollables = html.querySelectorAll('.rollable');
	rollables.forEach((el) => {
		el.addEventListener('click', (ev) => {
			const element = ev.currentTarget;
			const dataset = element.dataset;
			if (dataset.rollType === 'item') {
				const parentItem = element.closest('.item');
				if (!parentItem) return;

				const itemId = parentItem.dataset.itemId;
				const item = sheet.actor.items.get(itemId);
				if (item) {
					item.sheet._onSendToChat(ev);
				}
			}
		});
	});
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

function sortByOrder(a, b) {
	return this.sortOrder * (a.sort || 0) - this.sortOrder * (b.sort || 0);
}

function sortByName(a, b) {
	const nameA = a.name.toUpperCase();
	const nameB = b.name.toUpperCase();
	return this.sortOrder * nameA.localeCompare(nameB);
}

function sortByType(a, b) {
	const typeA = a.type.toUpperCase();
	const typeB = b.type.toUpperCase();
	return this.sortOrder * typeA.localeCompare(typeB);
}

function prepareSorting(context) {
	// Sort the items array in-place based on the current sorting method
	let sortFn = sortByOrder;
	if (this.sortMethod === 'name') {
		sortFn = sortByName;
	} else if (this.sortMethod === 'type') {
		sortFn = sortByType;
	}
	sortFn = sortFn.bind(this);
	context.items = context.items.contents.sort(sortFn);
	if (context.classFeatures) {
		Object.keys(context.classFeatures).forEach((k) => (context.classFeatures[k].items = Object.fromEntries(Object.entries(context.classFeatures[k].items).sort((a, b) => sortFn(a[1].item, b[1].item)))));
	}
	if (context.optionalFeatures) {
		Object.keys(context.optionalFeatures).forEach((k) => (context.optionalFeatures[k].items = Object.fromEntries(Object.entries(context.optionalFeatures[k].items).sort((a, b) => sortFn(a[1].item, b[1].item)))));
	}
}

function onRenderFUActorSheet(sheet, element) {
	// Automatically expand elements that are in the _expanded state
	console.log(sheet._expanded);
	if (sheet._expanded) {
		sheet._expanded.forEach((itemId) => {
			const expandedDescriptions = element.querySelectorAll(`li[data-item-id=${itemId}] .individual-description`);
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
 * @type {Readonly<{prepareItems: ((function(Object): Promise<void>)|*)}>}
 */
export const ActorSheetUtils = Object.freeze({
	prepareData,
	prepareItems,
	enrichItems,
	findItemConfig,
	prepareCharacterData,
	activateDefaultListeners,
	prepareClasses,
	prepareNpcCombat,
	prepareInventory,
	prepareSpells,
	prepareProjects,
	prepareFeatures,
	prepareAbilities,
	activateInventoryListeners,
	activateStashListeners,
	handleInventoryItemDrop,
	activateExpandedItemListener,
	prepareSorting,
	prepareNpcCompanionData,
	// Used by modules
	getWeaponDisplayData,
	getSkillDisplayData,
	getSpellDisplayData,
	getItemDisplayData,
});
