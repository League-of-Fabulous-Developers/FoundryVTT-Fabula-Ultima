import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { FUPartySheet } from './actor-party-sheet.mjs';
import { getPrioritizedUserTargeted } from '../helpers/target-handler.mjs';

const CLOCK_TYPES = ['zeroPower', 'ritual', 'miscAbility', 'rule'];
const SKILL_TYPES = ['skill'];
const RESOURCE_POINT_TYPES = ['miscAbility', 'skill', 'heroic'];
const WEARABLE_TYPES = ['armor', 'shield', 'accessory'];

/**
 * @description Prepares model-agnostic data for the actor
 * @param context
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
	context.system = sheet.actor.system;
	context.flags = sheet.actor.flags;
	context.itemCount = context.actor.items.size;
	context.isGM = game.user.isGM;
	context.isOwner = sheet.actor.isOwner;

	// Add support for formInput,formGroup
	// https://foundryvtt.wiki/en/development/api/helpers#forminput-and-formgroup
	context.document = sheet.document;
	context.fields = sheet.document.schema.fields;
	context.system = sheet.document.system;
	context.systemFields = sheet.document.system.schema.fields;

	await prepareItems(context);
}

/**
 * @description Organize and classify Items for Character sheets.
 * @param {Object} context The actor to prepare.
 */
async function prepareItems(context) {
	// Initialize containers.
	const basics = [];
	const weapons = [];
	const armor = [];
	const shields = [];
	const accessories = [];

	const classes = [];
	const skills = [];
	const heroics = [];
	const spells = [];
	const abilities = [];
	const rules = [];
	const behaviors = [];
	const consumables = [];
	const treasures = [];
	const projects = [];
	const rituals = [];
	const effects = [];

	// Iterate through items, allocating to containers
	for (let item of context.items) {
		item.img = item.img || CONST.DEFAULT_TOKEN;

		if (item.system.quality?.value) {
			item.quality = item.system.quality.value;
		}

		item.isMartial = item.system.isMartial?.value ? true : false;
		item.isOffensive = item.system.isOffensive?.value ? true : false;
		item.isBehavior = item.system.isBehavior?.value ? true : false;
		item.equipped = item.system.isEquipped?.value ? true : false;
		item.equippedSlot = item.system.isEquipped && item.system.isEquipped.slot ? true : false;
		item.level = item.system.level?.value;
		item.class = item.system.class?.value;
		item.mpCost = item.system.cost?.amount;
		item.target = item.system.targeting?.rule;
		item.duration = item.system.duration?.value;
		item.dLevel = item.system.dLevel?.value;
		item.clock = item.system.clock?.value;
		item.progressPerDay = item.system.progressPerDay?.value;
		item.days = item.system.days?.value;
		item.cost = item.system.cost?.value;
		item.discount = item.system.discount?.value;
		item.potency = item.system.potency?.value;
		item.area = item.system.area?.value;
		item.use = item.system.use?.value;
		item.defect = item.system.isDefect?.value ? true : false;
		item.defectMod = item.system.use?.value;
		item.progressCurr = item.system.progress?.current;
		item.progressStep = item.system.progress?.step;
		item.progressMax = item.system.progress?.max;

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
		if (SKILL_TYPES.includes(item.type)) {
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
		if (WEARABLE_TYPES.includes(item.type)) {
			item.def = item.isMartial && item.type === 'armor' ? item.system.def.value : `+${item.system.def.value}`;
			item.mdef = `+${item.system.mdef.value}`;
			item.init = item.system.init.value > 0 ? `+${item.system.init.value}` : item.system.init.value;
		}

		item.enrichedHtml = {
			description: await TextEditor.enrichHTML(item.system?.description ?? ''),
		};

		if (item.type === 'basic') {
			const itemObj = context.actor.items.get(item._id);
			const weapData = getWeaponDisplayData(context.actor, itemObj);
			item.quality = weapData.qualityString;
			item.detail = weapData.detailString;
			item.attackString = weapData.attackString;
			item.damageString = weapData.damageString;
			basics.push(item);
		} else if (item.type === 'weapon') {
			item.unarmedStrike = context.actor.getSingleItemByFuid('unarmed-strike');
			const itemObj = context.actor.items.get(item._id);
			const weapData = getWeaponDisplayData(context.actor, itemObj);
			item.quality = weapData.qualityString;
			item.detail = weapData.detailString;
			item.attackString = weapData.attackString;
			item.damageString = weapData.damageString;
			weapons.push(item);
		} else if (item.type === 'armor') {
			armor.push(item);
		} else if (item.type === 'shield') {
			const itemObj = context.actor.items.get(item._id);
			const weapData = getWeaponDisplayData(context.actor, itemObj);
			item.quality = weapData.qualityString;
			item.detail = weapData.detailString;
			item.attackString = weapData.attackString;
			item.damageString = weapData.damageString;
			shields.push(item);
		} else if (item.type === 'accessory') {
			accessories.push(item);
		} else if (item.type === 'class') {
			classes.push(item);
		} else if (item.type === 'skill') {
			const itemObj = context.actor.items.get(item._id);
			const skillData = getSkillDisplayData(itemObj);
			item.quality = skillData.qualityString;
			skills.push(item);
		} else if (item.type === 'heroic') {
			heroics.push(item);
		} else if (item.type === 'spell') {
			const itemObj = context.actor.items.get(item._id);
			const spellData = getSpellDisplayData(context.actor, itemObj);
			item.quality = spellData.qualityString;
			item.detail = spellData.detailString;
			item.attackString = spellData.attackString;
			item.damageString = spellData.damageString;
			spells.push(item);
		} else if (item.type === 'miscAbility') {
			const itemObj = context.actor.items.get(item._id);
			const skillData = getSkillDisplayData(itemObj);
			item.quality = skillData.qualityString;
			abilities.push(item);
		} else if (item.type === 'rule') {
			rules.push(item);
		} else if (item.type === 'behavior') {
			behaviors.push(item);
		} else if (item.type === 'consumable') {
			const itemObj = context.actor.items.get(item._id);
			const itemData = getItemDisplayData(itemObj);
			item.quality = itemData.qualityString;
			consumables.push(item);
		} else if (item.type === 'treasure') {
			const itemObj = context.actor.items.get(item._id);
			const itemData = getItemDisplayData(itemObj);
			item.quality = itemData.qualityString;
			treasures.push(item);
		} else if (item.type === 'project') {
			const itemObj = context.actor.items.get(item._id);
			item.cost = itemObj.system.cost?.value;
			item.discount = itemObj.system.discount?.value;
			item.progressMax = itemObj.system.progress?.max;
			item.progressPerDay = itemObj.system.progressPerDay?.value;
			item.days = itemObj.system.days?.value;
			item.progressCurr = itemObj.system.progress?.current;
			item.progressStep = itemObj.system.progress?.step;
			projects.push(item);
		} else if (item.type === 'ritual') {
			const itemObj = context.actor.items.get(item._id);
			item.mpCost = itemObj.system.mpCost?.value;
			item.dLevel = itemObj.system.dLevel?.value;
			item.clock = itemObj.system.clock?.value;
			rituals.push(item);
		} else if (item.type === 'effect') {
			effects.push(item);
		}
	}

	// Assign and return
	context.basics = basics;
	context.weapons = weapons;
	context.armor = armor;
	context.shields = shields;
	context.accessories = accessories;
	context.equipment = [...weapons, ...armor, ...shields, ...accessories];
	context.classes = classes;
	context.skills = skills;
	context.heroics = heroics;
	context.spells = spells;
	context.abilities = abilities;
	context.rules = rules;
	context.behaviors = behaviors;
	context.consumables = consumables;
	context.treasures = treasures;
	context.projects = projects;
	context.rituals = rituals;
	context.effects = effects;
	context.classFeatures = {};
	for (const item of context.actor.itemTypes.classFeature) {
		const featureType = (context.classFeatures[item.system.featureType] ??= {
			feature: item.system.data?.constructor,
			items: {},
		});
		featureType.items[item.id] = { item, additionalData: await featureType.feature?.getAdditionalData(item.system.data) };
	}

	context.optionalFeatures = {};
	for (const item of context.actor.itemTypes.optionalFeature) {
		const optionalType = (context.optionalFeatures[item.system.optionalType] ??= {
			optional: item.system.data?.constructor,
			items: {},
		});
		optionalType.items[item.id] = { item, additionalData: await optionalType.optional?.getAdditionalData(item.system.data) };

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

	const qualityString = [capitalizeFirst(item.system?.class?.value), weaponString, attackString, damageString].filter(Boolean).join(' ⬥ ');

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
	const qualityString = [capitalizeFirst(item.system.cost.amount), capitalizeFirst(item.system.targeting.rule), capitalizeFirst(item.system.duration.value), qualText].filter(Boolean).join(' ⬥ ');

	return {
		attackString,
		damageString,
		detailString,
		qualityString,
	};
}

/**
 * @param html
 * @param {ActorSheet} sheet
 */
function activateDefaultListeners(html, sheet) {
	html.on('click', '.item-edit', (ev) => _onItemEdit($(ev.currentTarget), sheet));
	html.on('mouseup', '.item', (ev) => _onMiddleClickEditItem(ev, sheet)); // Middle-click to edit item

	// Initialize the context menu options
	const contextMenuOptions = [
		{
			name: game.i18n.localize('FU.Edit'),
			icon: '<i class="fas fa-edit"></i>',
			callback: (jq) => _onItemEdit(jq, sheet),
			condition: (jq) => !!jq.data('itemId'),
		},
		{
			name: game.i18n.localize('FU.Duplicate'),
			icon: '<i class="fas fa-clone"></i>',
			callback: (jq) => _onItemDuplicate(jq, sheet),
			condition: (jq) => !!jq.data('itemId'),
		},
		{
			name: game.i18n.localize('FU.Delete'),
			icon: '<i class="fas fa-trash"></i>',
			callback: (jq) => _onItemDelete(jq, sheet),
			condition: (jq) => !!jq.data('itemId'),
		},
	];
	if (sheet.actor.isCharacterType) {
		contextMenuOptions.push({
			name: game.i18n.localize('FU.StashItem'),
			icon: '<i class="fa fa-paper-plane"></i>',
			callback: (jq) => onSendItemToPartyStash(jq, sheet),
			condition: (jq) => {
				const item = sheet.actor.items.get(jq.data('itemId'));
				return item.canStash;
			},
		});
	}
	html.on('click', '.item-option', (jq) => {
		const itemId = jq.currentTarget.dataset.itemId;

		// Check for the Behavior option before adding it
		const behaviorOptionExists = contextMenuOptions.some((option) => option.name === game.i18n.localize('FU.Behavior'));
		if (sheet.actor.type === 'npc' && game.settings.get('projectfu', 'optionBehaviorRoll') && !behaviorOptionExists) {
			const item = sheet.actor.items.get(itemId);

			if (item?.system?.isBehavior) {
				const behaviorClass = item.system.isBehavior.value ? 'fas active' : 'far';

				contextMenuOptions.push({
					name: game.i18n.localize('FU.Behavior'),
					icon: `<i class="${behaviorClass} fa-address-book"></i>`,
					callback: (jq) => _onItemBehavior(jq, sheet),
					condition: (jq) => !!jq.data('itemId'),
				});
			}
		}
	});
	// eslint-disable-next-line no-undef
	new ContextMenu(html, '.item-option', contextMenuOptions, {
		eventName: 'click',
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
		html.find('li.item').each((i, li) => {
			if (li.classList.contains('inventory-header')) return;
			li.setAttribute('draggable', true);
			li.addEventListener('dragstart', handler, false);
		});
	}

	// Automatically expand elements that are in the _expanded state
	sheet._expanded.forEach((itemId) => {
		const desc = html.find(`li[data-item-id="${itemId}"] .individual-description`);
		if (desc.length) {
			desc.removeClass('hidden').css({ display: 'block', height: 'auto' });
		}
	});
}

function activateExpandedItemListener(html, expanded, onExpand) {
	html.find('.click-item').click((ev) => {
		const el = $(ev.currentTarget);
		const parentEl = el.closest('li');
		const itemId = parentEl.data('itemId');
		const desc = parentEl.find('.individual-description');

		if (expanded.has(itemId)) {
			desc.slideUp(200, () => desc.css('display', 'none'));
			expanded.delete(itemId);
		} else {
			desc.slideDown(200, () => {
				desc.css('display', 'block');
				desc.css('height', 'auto');
			});
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

async function onSendItemToPartyStash(jq, sheet) {
	const item = sheet.actor.items.get(jq.data('itemId'));
	const party = await FUPartySheet.getActiveModel();
	if (party) {
		return InventoryPipeline.requestTrade(sheet.actor.uuid, item.uuid, false, party.parent.uuid);
	}
}

/**
 * Handles the editing of an item.
 * @param {jQuery} jq - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 */
function _onItemEdit(jq, sheet) {
	const dataItemId = jq.data('itemId');
	const item = sheet.actor.items.get(dataItemId);
	if (item) item.sheet.render(true);
}

/**
 * Toggles the behavior state of the specified item.
 * @param {jQuery} jq - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>} - A promise that resolves when the item's behavior state has been updated.
 */
async function _onItemBehavior(jq, sheet) {
	const itemId = jq.data('itemId');
	const item = sheet.actor.items.get(itemId);
	const isBehaviorBool = item.system.isBehavior.value;
	sheet.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isBehavior.value': !isBehaviorBool }]);
}

/**
 * Deletes the specified item after confirming with the user.
 * @param {jQuery} jq - The element that the ContextMenu was attached to.
 * @param {ActorSheet} sheet
 * @returns {Promise<void>} - A promise that resolves when the item has been deleted.
 */
async function _onItemDelete(jq, sheet) {
	const item = sheet.actor.items.get(jq.data('itemId'));
	if (
		await Dialog.confirm({
			title: game.i18n.format('FU.DialogDeleteItemTitle', { item: item.name }),
			content: game.i18n.format('FU.DialogDeleteItemDescription', { item: item.name }),
			rejectClose: false,
		})
	) {
		await item.delete();
		jq.slideUp(200, () => sheet.render(false));
	}
}

/**
 * Duplicates the specified item and adds it to the actor's item list.
 * @param {jQuery} jq - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 * @returns {Promise<void>} - A promise that resolves when the item has been duplicated.
 */
async function _onItemDuplicate(jq, sheet) {
	const item = sheet.actor.items.get(jq.data('itemId'));
	if (item) {
		const dupData = foundry.utils.duplicate(item);
		dupData.name += ` (${game.i18n.localize('FU.Copy')})`;
		await sheet.actor.createEmbeddedDocuments('Item', [dupData]);
		sheet.render();
	}
}

// Handle middle-click editing of an item sheet
function _onMiddleClickEditItem(ev, sheet) {
	if (ev.button === 1 && !$(ev.target).hasClass('item-edit')) {
		ev.preventDefault();
		_onItemEdit($(ev.currentTarget), sheet);
	}
}

/**
 * @param html
 * @param {ActorSheet} sheet
 */
function activateInventoryListeners(html, sheet) {
	html.find('a[data-action="clearInventory"]').click((ev) => {
		ev.preventDefault();
		console.debug(`Clearing all items from actor ${sheet.actor}`);
		sheet.actor.clearEmbeddedItems();
	});
	html.on('click', '.item-create', (ev) => _onItemCreate(ev, sheet));
	html.on('click', '.item-create-dialog', (ev) => _onItemCreateDialog(ev, sheet));
	html.on('click', '.item-sell', (ev) => onTradeItem($(ev.currentTarget), sheet, true));
	html.on('click', '.item-share', (ev) => onTradeItem($(ev.currentTarget), sheet, false));
	html.on('click', '.item-loot', (ev) => onLootItem($(ev.currentTarget), sheet, false, ev));
	html.on('click', '.zenit-distribute', async (ev) => {
		return InventoryPipeline.distributeZenit(sheet.actor);
	});
	html.on('click', '.recharge-ip', async (ev) => {
		return InventoryPipeline.requestRecharge(sheet.actor);
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
 * @param {jQuery} jq - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 * @param {Boolean} sell
 */
function onLootItem(jq, sheet, sell, event) {
	const dataItemId = jq.data('itemId');
	const sourceActor = sheet.actor;
	const item = sourceActor.items.get(dataItemId);
	if (!item) {
		return;
	}
	const targetActor = getPrioritizedUserTargeted();
	if (!targetActor) {
		return;
	}

	const modifiers = getModifiers(event);
	InventoryPipeline.requestTrade(sourceActor.uuid, item.uuid, false, targetActor.uuid, modifiers);
}

/**
 * @description Handles looting item directly from a sheet
 * @param {jQuery} jq - The element that the ContextMenu was attached to
 * @param {ActorSheet} sheet
 * @param {Boolean} sell
 */
function onTradeItem(jq, sheet, sell) {
	const dataItemId = jq.data('itemId');
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
	const header = ev.currentTarget;
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

	const dataType = ev.currentTarget.dataset.type;
	let types;
	let clock = false;

	// Get all available item types and class feature types
	const allItemTypes = Object.keys(CONFIG.Item.dataModels);
	const isCharacter = sheet.actor.type === 'character';
	const isNPC = sheet.actor.type === 'npc';
	const optionalFeatureTypes = Object.entries(CONFIG.FU.optionalFeatureRegistry.optionals());
	switch (dataType) {
		case 'newClock':
			types = allItemTypes.map((type) => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));
			if (isCharacter) {
				const options = ['miscAbility', 'ritual'];

				// Optional Features
				const optionalFeatures = [];

				// Check if the optionZeroPower setting is false, then add the zeroPower feature
				if (game.settings.get(SYSTEM, SETTINGS.optionZeroPower)) {
					optionalFeatures.push({
						type: 'optionalFeature',
						subtype: 'projectfu.zeroPower',
						label: game.i18n.localize('Zero Power'),
					});
				}

				// Filter out items based on options
				types = types.filter((item) => options.includes(item.type));

				// Filter out 'quirk' and 'camping' optional feature types
				const filteredOptionalFeatures = optionalFeatures.filter((feature) => !['projectfu.quirk', 'projectfu-playtest.camping'].includes(feature.subtype));

				// Push filtered optional features to types array
				types.push(...filteredOptionalFeatures);
			} else if (isNPC) {
				types = types.filter((item) => ['miscAbility', 'rule'].includes(item.type));
			}
			clock = true;
			break;
		case 'newFavorite':
			types = allItemTypes.map((type) => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`) }));

			if (isCharacter) {
				// Filter out item type
				let dontShowCharacter = ['rule', 'behavior', 'basic']; // Default types to hide for characters
				// Filter out default types to hide for characters
				types = types.filter((item) => !dontShowCharacter.includes(item.type));

				// Conditional rendering for optional features based on system settings
				let dontShowOptional = [];
				if (!game.settings.get(SYSTEM, SETTINGS.optionZeroPower)) {
					dontShowOptional.push('projectfu.zeroPower');
				}
				if (!game.settings.get(SYSTEM, SETTINGS.optionQuirks)) {
					dontShowOptional.push('projectfu.quirk');
				}
				if (!game.settings.get(SYSTEM, SETTINGS.optionCampingRules)) {
					dontShowOptional.push('projectfu-playtest.camping');
				}

				// Optional Features
				let optionalFeatures = optionalFeatureTypes.map(([key, optional]) => ({
					type: 'optionalFeature',
					subtype: key,
					label: game.i18n.localize(optional.translation),
				}));

				// Filter out optional features based on system settings
				let filteredOptionalFeatures = optionalFeatures.filter((feature) => !dontShowOptional.includes(feature.subtype));

				// Push filtered optional features to types array
				types.push(...filteredOptionalFeatures);
			} else if (isNPC) {
				let dontShowNPC = ['class', 'classFeature', 'optionalFeature', 'skill', 'heroic', 'project', 'ritual', 'consumable']; // Default types to hide for NPCs
				if (!game.settings.get(SYSTEM, SETTINGS.optionBehaviorRoll)) dontShowNPC.push('behavior');
				// Filter out default types to hide for NPCs
				types = types.filter((item) => !dontShowNPC.includes(item.type));
			}
			break;
		case 'newClassFeatures': {
			const classFeatureTypes = Object.entries(CONFIG.FU.classFeatureRegistry.features());
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

			// Optional Features
			const dontShow = [];
			if (!game.settings.get(SYSTEM, SETTINGS.optionZeroPower)) {
				dontShow.push('projectfu.zeroPower');
			}
			if (!game.settings.get(SYSTEM, SETTINGS.optionQuirks)) {
				dontShow.push('projectfu.quirk');
			}
			if (!game.settings.get(SYSTEM, SETTINGS.optionCampingRules)) {
				dontShow.push('projectfu-playtest.camping');
			}

			// Filter optionalFeatureTypes based on dontShow array
			const filteredOptionalFeatureTypes = optionalFeatureTypes.filter(([key, optional]) => !dontShow.includes(key));

			// Push filtered types to the types array
			types.push(
				...filteredOptionalFeatureTypes.map(([key, optional]) => ({
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

	const buttons = types.map((item) => ({
		label: item.label ?? (item.subtype ? item.subtype.split('.')[1] : item.type),
		callback: () => _createItem(item.type, clock, item.subtype, sheet),
	}));

	new Dialog({
		title: 'Select Item Type',
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
 * @param html
 * @param {ActorSheet} sheet
 * @returns
 */
async function activateStashListeners(html, sheet) {
	html.find('.rollable').click((ev) => {
		const element = ev.currentTarget;
		const dataset = element.dataset;
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = sheet.actor.items.get(itemId);
				if (item) {
					item.sheet._onSendToChat(ev);
				}
			}
		}
	});
}

const capitalizeFirst = (string) => (typeof string === 'string' ? string.charAt(0).toUpperCase() + string.slice(1) : string);

/**
 * @description Provides utility functions for rendering the actor sheet
 * @type {Readonly<{prepareItems: ((function(Object): Promise<void>)|*)}>}
 */
export const ActorSheetUtils = Object.freeze({
	prepareData,
	prepareItems,
	findItemConfig,
	activateDefaultListeners,
	activateInventoryListeners,
	activateStashListeners,
	handleInventoryItemDrop,
	activateExpandedItemListener,
	// Used by modules
	getWeaponDisplayData,
	getSkillDisplayData,
	getSpellDisplayData,
	getItemDisplayData,
});
