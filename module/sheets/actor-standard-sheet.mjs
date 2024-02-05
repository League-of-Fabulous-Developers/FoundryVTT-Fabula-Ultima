import {
    isActiveEffectForStatusEffectId,
    onManageActiveEffect,
    prepareActiveEffectCategories,
    toggleStatusEffect
} from '../helpers/effects.mjs';
import {promptCheck} from '../helpers/checks.mjs';
import {GroupCheck} from '../helpers/group-check.mjs';

const TOGGLEABLE_STATUS_EFFECT_IDS = ['crisis', 'slow', 'dazed', 'enraged', 'dex-up', 'mig-up', 'ins-up', 'wlp-up', 'ko', 'weak', 'shaken', 'poisoned', 'dex-down', 'mig-down', 'ins-down', 'wlp-down'];

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FUStandardActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['projectfu', 'sheet', 'actor'],
			template: 'systems/projectfu/templates/actor/actor-character-sheet.hbs',
			width: 750,
			height: 1150,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'stats',
				},
			],
		});
	}

	/** @override */
	get template() {
		return `systems/projectfu/templates/actor/actor-${this.actor.type}-sheet.hbs`;
	}

	/* -------------------------------------------- */

	/** @override */
	getData() {
		// Retrieve the data structure from the base sheet. You can inspect or log
		// the context variable to see the structure, but some key properties for
		// sheets are the actor object, the data object, whether or not it's
		// editable, the items array, and the effects array.
		const context = super.getData();

		// Use a safe clone of the actor data for further operations.
		const actorData = this.actor.toObject(false);

		// Add the actor's data to context.data for easier access, as well as flags.
		context.system = actorData.system;
		context.flags = actorData.flags;

		this._prepareItems(context);
		this._prepareCharacterData(context);
		// Initialize the _expanded set as a local variable within the object or class
		this._expanded = new Set();
		// Prepare character data and items.
		if (actorData.type == 'character') {
			const tlTracker = this.actor.getTLTracker();
			context.tlTracker = tlTracker;
		}

		// Prepare NPC data and items.
		if (actorData.type == 'npc') {
			const spTracker = this.actor.getSPTracker();
			context.spTracker = spTracker;
		}

		context.statusEffectToggles = [];
		// Setup status effect toggle data
		for (const id of TOGGLEABLE_STATUS_EFFECT_IDS) {
			const statusEffect = CONFIG.statusEffects.find((e) => e.id === id);
			if (statusEffect) {
				const existing = this.actor.effects.some((e) => isActiveEffectForStatusEffectId(e, statusEffect.id));
				context.statusEffectToggles.push({ ...statusEffect, active: existing });
			}
		}

		// Add roll data for TinyMCE editors.
		context.rollData = context.actor.getRollData();

		// Prepare active effects
		context.effects = prepareActiveEffectCategories(this.actor.effects);

		// Add the actor object to context for easier access
		context.actor = actorData;

		return context;
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareCharacterData(context) {
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
			v.label = game.i18n.localize(CONFIG.FU.affinities[k]) ?? k;
			v.affTypeBase = game.i18n.localize(CONFIG.FU.affType[v.base]) ?? v.base;
			v.affTypeBaseAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.base]) ?? v.base;
			v.affTypeCurr = game.i18n.localize(CONFIG.FU.affType[v.current]) ?? v.current;
			v.affTypeCurrAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.current]) ?? v.current;
			v.icon = CONFIG.FU.affIcon[k];
		}

		// Handle item types
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareItems(context) {
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
		const zeroPowers = [];

		// Iterate through items, allocating to containers
		for (let i of context.items) {
			i.img = i.img || DEFAULT_TOKEN;

			if (i.system.quality?.value) {
				i.quality = i.system.quality.value;
			}

			i.isMartial = i.system.isMartial?.value ? true : false;
			i.isOffensive = i.system.isOffensive?.value ? true : false;
			i.isBehavior = i.system.isBehavior?.value ? true : false;
			i.equipped = i.system.isEquipped?.value ? true : false;
			i.equippedSlot = i.system.isEquipped && i.system.isEquipped.slot ? true : false;
			i.level = i.system.level?.value;
			i.class = i.system.class?.value;
			i.mpCost = i.system.mpCost?.value;
			i.target = i.system.target?.value;
			i.duration = i.system.duration?.value;
			i.dLevel = i.system.dLevel?.value;
			i.clock = i.system.clock?.value;
			i.progressPerDay = i.system.progressPerDay?.value;
			i.days = i.system.days?.value;
			i.cost = i.system.cost?.value;
			i.discount = i.system.discount?.value;
			i.potency = i.system.potency?.value;
			i.area = i.system.area?.value;
			i.use = i.system.use?.value;
			i.defect = i.system.isDefect?.value ? true : false;
			i.defectMod = i.system.use?.value;
			i.zeroTrigger = i.system.zeroTrigger?.value;
			i.zeroEffect = i.system.zeroEffect?.value;
			i.progressCurr = i.system.progress?.current;
			i.progressStep = i.system.progress?.step;
			i.progressMax = i.system.progress?.max;

			for (let i of context.items) {
				// Prepare progress clock array
				if (i.type === 'zeroPower' || i.type === 'ritual' || i.type === 'miscAbility' || i.type === 'rule') {
					const progressArr = [];

					const progress = i.system.progress ? i.system.progress : { current: 0, max: 6 };

					for (let i = 0; i < progress.max; i++) {
						progressArr.push({
							id: i + 1,
							checked: parseInt(progress.current) === i + 1 ? true : false,
						});
					}

					if (progress.current === progress.max) {
						console.log('Clock is completed!');
					}

					i.progressArr = progressArr.reverse();
				}
			}

			if (['armor', 'shield', 'accessory'].includes(i.type)) {
				i.def = i.isMartial && i.type === 'armor' ? i.system.def.value : `+${i.system.def.value}`;
				i.mdef = `+${i.system.mdef.value}`;
				i.init = i.system.init.value > 0 ? `+${i.system.init.value}` : i.system.init.value;
			}
			if (i.type === 'basic') {
				const itemObj = context.actor.items.get(i._id);
				const weapData = itemObj.getWeaponDisplayData();
				i.quality = weapData.qualityString;
				i.attackString = weapData.attackString;
				i.damageString = weapData.damageString;
				basics.push(i);
			} else if (i.type === 'weapon') {
				const itemObj = context.actor.items.get(i._id);
				const weapData = itemObj.getWeaponDisplayData();
				i.quality = weapData.qualityString;
				i.attackString = weapData.attackString;
				i.damageString = weapData.damageString;
				weapons.push(i);
			} else if (i.type === 'armor') {
				armor.push(i);
			} else if (i.type === 'shield') {
				const itemObj = context.actor.items.get(i._id);
				const weapData = itemObj.getWeaponDisplayData();
				i.quality = weapData.qualityString;
				i.attackString = weapData.attackString;
				i.damageString = weapData.damageString;
				shields.push(i);
			} else if (i.type === 'accessory') {
				accessories.push(i);
			} else if (i.type === 'class') {
				classes.push(i);
			} else if (i.type === 'skill') {
				const itemObj = context.actor.items.get(i._id);
				const skillData = itemObj.getSkillDisplayData();
				i.quality = skillData.qualityString;
				i.starCurrent = skillData.starCurrent;
				i.starMax = skillData.starMax;
				skills.push(i);
			} else if (i.type === 'heroic') {
				heroics.push(i);
			} else if (i.type === 'spell') {
				const itemObj = context.actor.items.get(i._id);
				const spellData = itemObj.getSpellDisplayData();
				i.quality = spellData.qualityString;
				i.attackString = spellData.attackString;
				i.damageString = spellData.damageString;
				spells.push(i);
			} else if (i.type === 'miscAbility') {
				const itemObj = context.actor.items.get(i._id);
				const skillData = itemObj.getSkillDisplayData();
				i.quality = skillData.qualityString;
				abilities.push(i);
			} else if (i.type === 'rule') {
				rules.push(i);
			} else if (i.type === 'behavior') {
				behaviors.push(i);
			} else if (i.type === 'consumable') {
				const itemObj = context.actor.items.get(i._id);
				const itemData = itemObj.getItemDisplayData();
				i.quality = itemData.qualityString;
				consumables.push(i);
			} else if (i.type === 'treasure') {
				const itemObj = context.actor.items.get(i._id);
				const itemData = itemObj.getItemDisplayData();
				i.quality = itemData.qualityString;
				treasures.push(i);
			} else if (i.type === 'project') {
				projects.push(i);
			} else if (i.type === 'ritual') {
				rituals.push(i);
			} else if (i.type === 'zeroPower') {
				zeroPowers.push(i);
			}
		}

		// Assign and return
		context.basics = basics;
		context.weapons = weapons;
		context.armor = armor;
		context.shields = shields;
		context.accessories = accessories;
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
		context.zeroPowers = zeroPowers;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Render the item sheet for viewing/editing prior to the editable check.
		html.find('.item-edit').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const item = this.actor.items.get(li.data('itemId'));
			item.sheet.render(true);
		});

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Use Equipment
		html.find('.use-equipment').click(this._onUseEquipment.bind(this));

		// Duplicate Inventory Item
		html.find('.item-duplicate').click(this._onItemDuplicate.bind(this));

		// Add Inventory Item
		html.find('.item-create').click(this._onItemCreate.bind(this));

		// Delete Inventory Item
		html.find('.item-delete').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const item = this.actor.items.get(li.data('itemId'));
			item.delete();
			li.slideUp(200, () => this.render(false));
		});

		// Update Progress
		html.find('.progress input').click((ev) => this._onProgressUpdate(ev));

		// Update Progress
		html.find('.progress input').contextmenu((ev) => this._onProgressReset(ev));

		function handleItemClick(ev, isRightClick) {
			const li = $(ev.currentTarget).parents('.item');
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			const itemType = item.system.type;
			const handType = item.system.hands;

			// Determine the slot based on item type
			const slotLookup = {
				weapon: isRightClick ? 'offHand' : 'mainHand',
				shield: isRightClick ? 'offHand' : 'mainHand',
				armor: 'armor',
				accessory: 'accessory',
			};

			const slot = slotLookup[item.type] || 'default';

			// Unequip all items in the same slot
			this.actor.items.forEach((i) => {
				if (i.system.isEquipped && i.system.isEquipped.slot === slot) {
					i.update({
						'system.isEquipped.value': false,
						'system.isEquipped.slot': 'default',
					});
				}
			});

			// Equip the selected item
			item.update({
				'system.isEquipped.value': true,
				'system.isEquipped.slot': slot,
			});

			// Update the HTML icon based on the equipped item
			const icon = li.find('.item-icon');
			icon.removeClass('fa-toolbox').addClass(getIconClassForEquippedItem(item, itemType, handType));

			// Prevent the default right-click context menu if it's a right-click event
			if (isRightClick) {
				ev.preventDefault();
			}

			// Log information
			// console.log('Item ID:', itemId);
			// console.log('Item Type:', itemType);
			// console.log('Equipped Slot:', slot);
			// console.log('Current Equipped:', currentEquipped);
			// console.log(
			// 	`${slot} Equipped Items:`,
			// 	this.actor.items.filter((i) => i.system.isEquipped && i.system.isEquipped.slot === slot).map((i) => i.name),
			// );
		}

		// Helper function to get the icon class for an equipped item
		function getIconClassForEquippedItem(item, itemType, handType) {
			if (item.system.isEquipped.slot === 'mainHand' && itemType === 'weapon' && handType === 'two-handed') {
				return 'ra ra-relic-blade ra-2x';
			} else if (item.system.isEquipped.slot === 'mainHand' && itemType === 'weapon' && handType === 'one-handed') {
				return 'ra ra-sword ra-2x';
			} else if (item.system.isEquipped.slot === 'offHand' && itemType === 'weapon') {
				return 'ra ra-sword ra-flip-horizontal ra-2x';
			} else if (item.system.isEquipped.slot === 'mainHand') {
				return item.type === 'shield' && item.system.isDualShield && item.system.isDualShield.value ? 'ra ra-heavy-shield' : 'ra ra-shield';
			} else if (item.system.isEquipped.slot === 'offHand') {
				return 'ra ra-shield';
			} else {
				return 'fas fa-toolbox';
			}
		}

		html.find('.item-equip').on('click', (ev) => {
			handleItemClick.call(this, ev, false);
		});

		html.find('.item-equip').on('contextmenu', (ev) => {
			handleItemClick.call(this, ev, true);
		});

		// TODO: Figure out how to store description visibility state
		const animDuration = 250;

		const toggleDesc = (ev) => {
			const el = $(ev.currentTarget);
			const parentEl = el.closest('li');
			const itemId = parentEl.data('item-id');
			const desc = parentEl.find('.individual-description');

			if (this._expanded.has(itemId)) {
				desc.slideUp(animDuration, () => desc.css('display', 'none'));

				this._expanded.delete(itemId);
			} else {
				desc.slideDown(animDuration, () => {
					desc.css('display', 'block');
					desc.css('height', 'auto');
				});
				this._expanded.add(itemId);
			}

			updateDescVisibility(parentEl);
		};

		const updateDescVisibility = (parentEl) => {
			const itemId = parentEl.data('item-id');
			const isDescVisible = this._expanded.has(itemId);
		};

		html.find('.click-item').click(toggleDesc);

		// Add item to Favorite Section
		html.find('.item-favored').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			const isFavoredBool = item.system.isFavored.value;
			item.update();
			this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isFavored.value': !isFavoredBool }]);
		});

		// Add item to Behavior Roll
		html.find('.item-behavior').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			const isBehaviorBool = item.system.isBehavior.value;
			this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isBehavior.value': !isBehaviorBool }]);
		});

		// Increment and Decrement Buttons
		// html.find('.increment-button, .decrement-button').click((ev) => {
		// 	ev.preventDefault();
		// 	const currentSheet = $(ev.currentTarget).closest('.projectfu-actor-sheet');
		// 	if (currentSheet.length === 0) {
		// 		console.error('Current sheet not found.');
		// 		return;
		// 	}
		// 	const targetResource = $(ev.currentTarget).data('resource');
		// 	const action = $(ev.currentTarget).data('action');
		// 	const inputElement = currentSheet.find('#' + targetResource + '-input');
		// 	let currentValue = parseInt(inputElement.val());

		// 	if (isNaN(currentValue)) {
		// 		currentValue = 0;
		// 	}
		// 	if (action === 'increase') {
		// 		currentValue += 1;
		// 	} else if (action === 'decrease') {
		// 		currentValue = Math.max(currentValue - 1, 0);
		// 	}
		// 	inputElement.val(currentValue);
		// });

		// Active Effect management
		html.find('.effect-control').click((ev) => onManageActiveEffect(ev, this.actor));
		html.find('.status-effect-toggle').click((event) => {
			event.preventDefault();
			const a = event.currentTarget;
			toggleStatusEffect(this.actor, a.dataset.statusId);
		});

		// Rollable abilities.
		html.find('.rollable').click(this._onRoll.bind(this));


		// Drag events for macros.
		if (this.actor.isOwner) {
			let handler = (ev) => this._onDragStart(ev);
			html.find('li.item').each((i, li) => {
				if (li.classList.contains('inventory-header')) return;
				li.setAttribute('draggable', true);
				li.addEventListener('dragstart', handler, false);
			});
		}

		async function onRest(actor, isRightClick) {
			const maxHP = actor.system.resources.hp.max;
			const maxMP = actor.system.resources.mp.max;
			const maxIP = actor.system.resources.ip.max;

			const updateData = {
				'system.resources.hp.value': maxHP,
				'system.resources.mp.value': maxMP,
			};

			if (isRightClick) {
				updateData['system.resources.ip.value'] = maxIP;
			}

			await actor.update(updateData);
			if (updateData['system.resources.ip.value'] || !isRightClick) {
				actor.sheet.render(true);
			}
		}

		// Rest on left-click, different behavior on right-click
		html.find('.rest').on('click contextmenu', async (ev) => {
			ev.preventDefault();
			const isRightClick = ev.type === 'contextmenu';
			await onRest(this.actor, isRightClick);
		});

		// Check if bonds object exists, if not, initialize
		const bonds = this.actor.system.resources.bonds;
		if (!bonds) {
			const initialBonds = [];
			this.actor.system.resources.bonds = initialBonds;
			this.actor.update({ 'system.resources.bonds': initialBonds });
		} else if (!Array.isArray(bonds)) {
			//Convert bonds as object of indexes to bonds as array
			const currentBonds = [];
			for (const k in bonds) {
				currentBonds[k] = bonds[k];
			}
			this.actor.system.resources.bonds = currentBonds;
			this.actor.update({ 'system.resources.bonds': currentBonds });
		}

		// Event listener for adding a new bonds
		html.find('.bond-add').click(async (ev) => {
			ev.preventDefault();
			const bonds = this.actor.system.resources.bonds;
			if (bonds.length >= 6) {
				ui.notifications.warn('Maximum number of bonds (6) reached.');
				return;
			}
			const newBonds = [...bonds];
			newBonds.push({
				name: '',
				admInf: '',
				loyMis: '',
				affHat: '',
				strength: 0,
			});
			await this.actor.update({ 'system.resources.bonds': newBonds });
		});

		// Event listener for deleting a bond
		html.find('.bond-delete').click(async (ev) => {
			ev.preventDefault();
			const bondIndex = $(ev.currentTarget).data('bond-index');
			const newBonds = [...this.actor.system.resources.bonds];
			newBonds.splice(bondIndex, 1);
			await this.actor.update({ 'system.resources.bonds': newBonds });
		});

		function _sortAlphaList(array, html) {
			// Sort the array alphabetically by the "name" property
			array.sort((a, b) => {
				const nameA = a.name.toUpperCase();
				const nameB = b.name.toUpperCase();

				if (nameA < nameB) {
					return -1;
				}
				if (nameA > nameB) {
					return 1;
				}
				return 0;
			});

			// Update the HTML to reflect the sorted order
			const itemList = html.find('.item-list');
			itemList.empty(); // Clear the existing list

			// Iterate through the sorted array and add items to the HTML
			for (const item of array) {
				const listItem = `<li class="item" data-item-id="${item._id}">${item.name}</li>`;
				itemList.append(listItem);
			}
		}

		// Define a function to sort the list alphabetically
		// Event listener for sorting items alphabetically
		html.find('.item-name-sort').click(async function (ev) {
			ev.preventDefault();

			// Get the actor that owns the item

			// Get the items that belong to the actor
			const actor = this.actor;
			const li = parentEl;
			const itemId = li.data('item-id');
			const item = actor.items.get(itemId);
			const shieldArray = this.actor.getOwnedItems({ type: 'shield' });
			_sortAlphaList(shieldArray, html);

			// Update the actor's data with the modified item list
			await this.actor.update({
				items: shieldArray.map((item) => item.data),
			});

			// Trigger a sheet re-render
			this.actor.sheet.render(true);
		});
	}

	async _onUseEquipment(event) {
		const checkbox = event.currentTarget;
		const isChecked = checkbox.checked;

		if (!isChecked) {
			// Checkbox is unchecked
			// console.log('Checkbox is unchecked');

			// Get the actor's item collection
			const itemCollection = this.actor.items;

			// Iterate over each item in the collection
			itemCollection.forEach((item) => {
				if (item.system && item.system.isEquipped && item.system.isEquipped.value === true) {
					// Update the item to set 'system.isEquipped.value' to false
					item.update({
						'system.isEquipped.value': false,
						'system.isEquipped.slot': 'default',
					});
				}
			});
			// Log a message or perform other actions if needed
			// console.log('All equipped items have been set to unequip.');
		} else {
			// Checkbox is checked
			// console.log('Checkbox is checked');
		}
	}

	async _onItemDuplicate(event) {
		event.preventDefault();
		const header = event.currentTarget;
		const itemElement = header.closest('.item');

		if (!itemElement) return;

		// Get the item data
		const itemId = itemElement.dataset.itemId;
		const item = this.actor.items.get(itemId);

		if (!item) return;

		// Duplicate the item
		const duplicatedItemData = foundry.utils.duplicate(item);

		// Modify the duplicated item's name
		duplicatedItemData.name = `Copy of ${item.name}`;
		duplicatedItemData.system.isEquipped = {
			value: false,
			slot: 'default',
		};
		// Add the duplicated item to the actor
		await this.actor.createEmbeddedDocuments('Item', [duplicatedItemData]);
	}

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async _onItemCreate(event) {
		event.preventDefault();
		const header = event.currentTarget;
		// Get the type of item to create.
		const type = header.dataset.type;
		// Grab any data associated with this control.
		const data = foundry.utils.duplicate(header.dataset);
		// Initialize a default name.
		const name = `New ${type.capitalize()}`;
		// Prepare the item object.
		const itemData = {
			name: name,
			type: type,
			system: data,
		};
		// Remove the type from the dataset since it's in the itemData.type prop.
		delete itemData.system['type'];

		// Finally, create the item!
		return await Item.create(itemData, { parent: this.actor });
	}

	/**
	 * Rolls a random behavior for the given actor and displays the result in a chat message.
	 */
	_rollBehavior() {
		// Filter items in the actor's inventory to find behaviors
		const behaviors = this.actor.items.filter((item) => ['basic', 'weapon', 'shield', 'armor', 'accessory', 'spell', 'miscAbility', 'behavior'].includes(item.type) && item.system.isBehavior?.value);

		// Prepare an array to map behaviors with their weights
		const behaviorMap = [];

		// Populate the behaviorMap based on behavior weights
		behaviors.forEach((behavior) => {
			const weight = behavior.system.weight.value;
			const nameVal = behavior.name;
			const descVal = behavior.system.description;
			const idVal = behavior.id;

			for (let i = 0; i < weight; i++) {
				behaviorMap.push({
					name: nameVal,
					desc: descVal,
					id: idVal,
				});
			}
		});

		// Check if there are behaviors to choose from
		if (behaviorMap.length === 0) {
			console.error('No behavior selected.');
			return;
		}

		// Randomly select a behavior from the behaviorMap
		const randVal = Math.floor(Math.random() * behaviorMap.length);
		const selected = behaviorMap[randVal];
		// console.log(selected.id, " this works")

		// Get the item from the actor's items by id
		const item = this.actor.items.get(selected.id); // Use "this.actor" to access the actor's items

		if (item) {
			// Call the item's roll method
			item.roll();
		} else {
		}

		// Prepare an array for target priority
		const targetArray = [1, 2, 3, 4, 5];
		shuffleArray(targetArray); // Assuming shuffleArray is defined elsewhere

		// Prepare the content for the chat message
		const content = `<b>Enemy:</b> ${this.actor.name}<br /><b>Selected behavior:</b> ${selected.name}<br /><b>Target priority:</b> ${targetArray.join(' -> ')}`;

		// Check if the selected behavior's type is "item"
		if (selected.type === 'item') {
			// Get the item from the actor's items by id

			const item = actor.items.get(selected.id);
			// Check if the item exists
			if (item) {
				// Return the result of item.roll()
				item._onRoll.bind(this);
			}
		}

		// Prepare chat data for displaying the message
		const chatData = {
			user: game.user._id,
			speaker: ChatMessage.getSpeaker(),
			whisper: game.user._id,
			content,
		};

		// Create a chat message with the chat data
		ChatMessage.create(chatData);
	}

	// Set progress clock value to the segment clicked
	_onProgressUpdate(ev) {
		const input = ev.currentTarget;
		const segment = input.value;

		const li = $(input).closest('.item');

		if (li.length) {
			// If the clock is from an item
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			item.update({ 'system.progress.current': segment });
		} else {
			// If not from an item
			this.actor.update({ 'system.progress.current': segment });
		}
	}

	// Reset Progress Clock
	_onProgressReset(ev) {
		const input = ev.currentTarget;
		const li = $(input).closest('.item');
		if (li.length) {
			// If the clock is from an item
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			item.update({ 'system.progress.current': 0 });
		} else {
			// If not from an item
			this.actor.update({ 'system.progress.current': 0 });
		}
	}

	/**
	 * Handles clickable rolls based on different roll types.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onRoll(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		const isShift = event.shiftKey;

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) return item.roll(isShift);
			}
			if (dataset.rollType === 'behavior') {
				return this._rollBehavior();
			}
			if (dataset.rollType === 'roll-check' || dataset.rollType === 'roll-init') {
				return promptCheck(this.actor);
			}
			if (dataset.rollType === 'group-check') {
				GroupCheck.promptCheck(this.actor);
			}
		}

		// Handle item-slot rolls.
		if (dataset.rollType === 'item-slot') {
			// Get the actor that owns the item
			const actor = this.actor;
			// Get the items that belong to the actor
			const items = actor.items;
			// Determine the slot based on the header element class
			let slot = '';
			if (element.classList.contains('left-hand')) {
				slot = 'mainHand';
			} else if (element.classList.contains('right-hand')) {
				slot = 'offHand';
			} else if (element.classList.contains('acc-hand')) {
				slot = 'accessory';
			} else if (element.classList.contains('armor-hand')) {
				slot = 'armor';
			} else {
				slot = 'default';
			}
			// Filter the items by their equipped slot
			const sameSlotItems = items.filter((i) => i.system.isEquipped && i.system.isEquipped.slot === slot);
			// Get the first item from the filtered collection
			const item = sameSlotItems.find((i) => true);

			// Check if the item exists and call its roll method
			if (item) return item.roll(isShift);
		}

		// Handle action-type rolls.
		if (dataset.rollType === 'action-type') {
			// Get the actor that owns the item
			const actor = this.actor;
			// Determine the type based on the data-action attribute
			let action = '';
			switch (dataset.action) {
				case 'equipmentAction':
					action = 'equipment';
					break;
				case 'guardAction':
					action = 'guard';
					break;
				case 'hinderAction':
					action = 'hinder';
					break;
				case 'inventoryAction':
					action = 'inventory';
					break;
				case 'objectiveAction':
					action = 'objective';
					break;
				case 'spellAction':
					action = 'spell';
					break;
				case 'studyAction':
					action = 'study';
					break;
				case 'skillAction':
					action = 'skill';
					break;
				default:
					action = 'default';
					break;
			}
			console.log('Action Type: ', action);

			// Call the roll method with the determined action type
			// this.roll(action);
		}

		// Handle rolls that supply the formula directly.
		if (dataset.roll) {
			const label = dataset.label ? `${dataset.label}` : '';
			const roll = new Roll(dataset.roll, this.actor.getRollData());
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				flavor: label,
				rollMode: game.settings.get('core', 'rollMode'),
			});
			return roll;
		}
	}

	async _updateObject(event, data) {
		// Foundry's form update handlers send back bond information as an object {0: ..., 1: ....}
		// So correct an update in that form and create an updated bond array to properly represent the changes
		const bonds = data.system?.resources?.bonds;
		if (bonds) {
			if (!Array.isArray(bonds)) {
				const currentBonds = [];
				const maxIndex = Object.keys(bonds).length;
				for (let i = 0; i < maxIndex; i++) {
					currentBonds.push(bonds[i]);
				}
				data.system.resources.bonds = currentBonds;
			}
		}
		super._updateObject(event, data);
	}
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}
