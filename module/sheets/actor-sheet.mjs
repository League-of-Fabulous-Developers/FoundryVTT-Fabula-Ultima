import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FUActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['fabulaultima', 'sheet', 'actor'],
			template: 'systems/fabulaultima/templates/actor/actor-character-sheet.html',
			width: 600,
			height: 1150,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'features',
				},
			],
		});
	}

	/** @override */
	get template() {
		return `systems/fabulaultima/templates/actor/actor-${this.actor.type}-sheet.html`;
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
		}

		// Prepare NPC data and items.
		if (actorData.type == 'npc') {
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
		// Handle ability scores.
		for (let [k, v] of Object.entries(context.system.attributes)) {
			v.label = game.i18n.localize(CONFIG.FU.attributes[k]) ?? k;
		}
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
		const weapons = [];
		const armor = [];
		const shields = [];
		const accessories = [];
		const classes = [];
		const skills = [];
		const heroics = [];
		const spells = [];
		const abilities = [];
		const behaviors = [];
		const consumables = [];
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
			i.progress = i.system.progress?.value;
			i.progressPerDay = i.system.progressPerDay?.value;
			i.days = i.system.days?.value;
			i.potency = i.system.potency?.value;
			i.area = i.system.area?.value;
			i.use = i.system.use?.value;
			i.defect = i.system.isDefect?.value ? true : false;
			i.defectMod = i.system.use?.value;
			i.zeroTrigger = i.system.zeroTrigger?.value;
			i.zeroEffect = i.system.zeroEffect?.value;
			i.triggerCurr = i.system.trigger?.current;
			i.triggerStep = i.system.trigger?.step;
			i.triggerMax = i.system.trigger?.max;

			if (['armor', 'shield', 'accessory'].includes(i.type)) {
				i.def = i.isMartial && i.type === 'armor' ? i.system.def.value : `+${i.system.def.value}`;
				i.mdef = `+${i.system.mdef.value}`;
				i.init = i.system.init.value > 0 ? `+${i.system.init.value}` : i.system.init.value;
			}
			if (i.type === 'weapon') {
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
				spells.push(i);
			} else if (i.type === 'miscAbility') {
				const itemObj = context.actor.items.get(i._id);
				const skillData = itemObj.getSkillDisplayData();
				i.quality = skillData.qualityString;
				abilities.push(i);
			} else if (i.type === 'behavior') {
				behaviors.push(i);
			} else if (i.type === 'consumable') {
				const itemObj = context.actor.items.get(i._id);
				const itemData = itemObj.getItemDisplayData();
				i.quality = itemData.qualityString;
				consumables.push(i);
			} else if (i.type === 'project') {
				projects.push(i);
			} else if (i.type === 'ritual') {
				rituals.push(i);
			} else if (i.type === 'zeroPower') {
				zeroPowers.push(i);
			}
		}

		// Assign and return
		context.weapons = weapons;
		context.armor = armor;
		context.shields = shields;
		context.accessories = accessories;
		context.classes = classes;
		context.skills = skills;
		context.heroics = heroics;
		context.spells = spells;
		context.abilities = abilities;
		context.behaviors = behaviors;
		context.consumables = consumables;
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

		// Add Inventory Item
		html.find('.item-create').click(this._onItemCreate.bind(this));

		// Delete Inventory Item
		html.find('.item-delete').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const item = this.actor.items.get(li.data('itemId'));
			item.delete();
			li.slideUp(200, () => this.render(false));
		});

		function handleItemClick(ev, isRightClick) {
			const li = $(ev.currentTarget).parents('.item');
			const itemId = li.data('itemId');
			const item = this.actor.items.get(itemId);
			const currentEquipped = item.system.isEquipped.value;
			const itemType = item.system.type;

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
			icon.removeClass('fa-toolbox').addClass(getIconClassForEquippedItem(item, itemType));

			// Prevent the default right-click context menu if it's a right-click event
			if (isRightClick) {
				ev.preventDefault();
			}

			// Log information
			console.log('Item ID:', itemId);
			console.log('Item Type:', itemType);
			console.log('Equipped Slot:', slot);
			console.log('Current Equipped:', currentEquipped);
			console.log(
				`${slot} Equipped Items:`,
				this.actor.items.filter((i) => i.system.isEquipped && i.system.isEquipped.slot === slot).map((i) => i.name),
			);
		}

		// Helper function to get the icon class for an equipped item
		function getIconClassForEquippedItem(item, itemType) {
			if (item.system.isEquipped.slot === 'mainHand' && itemType === 'weapon' && item.system.hands.value === 'two-handed') {
				return 'ra ra-sword ra-2x';
			} else if (item.system.isEquipped.slot === 'mainHand' && itemType === 'weapon' && item.system.hands.value === 'one-handed') {
				return 'ra ra-plain-dagger ra-2x';
			} else if (item.system.isEquipped.slot === 'offHand' && itemType === 'weapon') {
				return 'ra ra-crossed-swords ra-2x';
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
			const up = parentEl.find('.fa-chevron-up');
			const down = parentEl.find('.fa-chevron-down');

			if (this._expanded.has(itemId)) {
				desc.slideUp(animDuration, () => desc.css('display', 'none'));
				up.css('display', 'inline');
				down.css('display', 'none');
				this._expanded.delete(itemId);
			} else {
				desc.slideDown(animDuration, () => {
					desc.css('display', 'block');
					desc.css('height', 'auto');
				});
				down.css('display', 'inline');
				up.css('display', 'none');
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
		html.find('.increment-button, .decrement-button').click((ev) => {
			const currentSheet = $(ev.currentTarget).closest('.fabulaultima-actor-sheet');
			if (currentSheet.length === 0) {
				console.error('Current sheet not found.');
				return;
			}
			const targetResource = $(ev.currentTarget).data('resource');
			const action = $(ev.currentTarget).data('action');
			const inputElement = currentSheet.find('#' + targetResource + '-input');
			let currentValue = parseInt(inputElement.val());

			if (isNaN(currentValue)) {
				currentValue = 0;
			}
			if (action === 'increase') {
				currentValue += 1;
			} else if (action === 'decrease') {
				currentValue = Math.max(currentValue - 1, 0);
			}
			inputElement.val(currentValue);
		});

		// Addable
		// html.find('.addable').on('click contextmenu', function (ev) {
		// 	// Prevent the default behavior of the context menu
		// 	if (ev.type === 'contextmenu') {
		// 		ev.preventDefault();
		// 	}

		// 	const li = $(ev.currentTarget).parents('.item');
		// 	const itemId = li.data('itemId');
		// 	const spanElement = $(this).find('span[data-resource]');

		// 	if (spanElement.length === 0) {
		// 		console.error('Span element with data-resource not found.');
		// 		return;
		// 	}

		// 	const targetResource = spanElement.data('resource');
		// 	console.log('Resource: ', targetResource);

		// 	const isRightClick = ev.type === 'contextmenu';
		// 	console.log('Rightclick: ', isRightClick);

		// 	let currentValue = parseInt(spanElement.text()) || 0;

		// 	if (isRightClick) {
		// 		currentValue -= 1;
		// 	} else {
		// 		currentValue += 1;
		// 	}

		// 	// Update the displayed value within the span element
		// 	spanElement.text(currentValue);
		// 	console.log(currentValue);

		// 	// Now, you can update the actual data of the item in Foundry VTT
		// 	// For example, you can use Foundry's updateObject function
		// 	const updateObject = {
		// 		_id: itemId,
		// 		data: {
		// 			// Update the property you want to change (e.g., value)
		// 			value: currentValue,
		// 		},
		// 	};
		// 	console.log('Update Object: ', updateObject);
		// 	console.log(game.user._id);
		// 	console.log(game.actors.get(actorID));
		// });

		// Active Effect management
		html.find('.effect-control').click((ev) => onManageActiveEffect(ev, this.actor));

		// Rollable abilities.
		html.find('.rollable').click(this._onRoll.bind(this));

		// Roll Check Options
		// TODO: Open Dialog Box for Roll Customizer
		html.find('.roll-check-option').click((ev) => {
			this._onRollCheckOption(ev);
		});

		// Drag events for macros.
		if (this.actor.isOwner) {
			let handler = (ev) => this._onDragStart(ev);
			html.find('li.item').each((i, li) => {
				if (li.classList.contains('inventory-header')) return;
				li.setAttribute('draggable', true);
				li.addEventListener('dragstart', handler, false);
			});
		}

		async function onRest(actor) {
			const maxHP = actor.system.resources.hp.max;
			const maxMP = actor.system.resources.mp.max;

			await actor.update({
				'system.resources.hp.value': maxHP,
				'system.resources.mp.value': maxMP,
			});

			actor.sheet.render(true);
		}

		// Rest
		html.find('.rest').click(async (ev) => {
			ev.preventDefault();
			await onRest(this.actor);
		});

		// Check if bonds object exists, if not, initialize
		if (!this.actor.system.resources.bonds) {
			initializeBonds(this.actor);
		}

		async function initializeBonds(actor) {
			const initialBonds = [];
			actor.system.resources.bonds = initialBonds;
			await actor.update({ 'system.resources.bonds': initialBonds });
			console.log('Bonds initialized:', initialBonds);
		}

		async function addBond(actor) {
			const bondsObject = actor.system.resources.bonds || {};

			// Check if the maximum number of bonds (6) has been reached
			if (Object.keys(bondsObject).length >= 6) {
				ui.notifications.warn('Maximum number of bonds (6) reached.');
				return;
			}

			// Find the next available index for the new bond
			let newIndex = 0;

			// Find the next available index for the new bond
			while (bondsObject[newIndex]) {
				newIndex++;
			}

			// Create a new bond object
			const newBond = {
				name: '',
				admInf: '',
				loyMis: '',
				affHat: '',
				strength: 0,
			};

			// Add the new bond to the bonds object using the next available index
			bondsObject[newIndex] = newBond;

			// Update the actor's data with the modified bonds object
			await actor.update({ 'system.resources.bonds': bondsObject });

			// Trigger a sheet re-render
			actor.sheet.render();

			console.log('Bonds after adding:', bondsObject);
		}

		async function deleteBond(actor, index) {
			const bondsObject = actor.system.resources.bonds || {};

			if (bondsObject[index]) {
				// Clear all the fields of the bond at the specified index
				bondsObject[index] = {
					name: '',
					admInf: '',
					loyMis: '',
					affHat: '',
					strength: 0,
				};

				// Update the actor's data with the modified bonds object
				await actor.update({ 'system.resources.bonds': bondsObject });

				// Trigger a sheet re-render
				actor.sheet.render();

				console.log('Bonds after clearing:', bondsObject);
			}
		}

		// Event listener for adding a new bonds
		html.find('.bond-add').click(async (ev) => {
			ev.preventDefault();
			await addBond(this.actor);
		});

		// Event listener for deleting a bond
		html.find('.bond-delete').click(async (ev) => {
			ev.preventDefault();
			const bondsObject = this.actor.system.resources.bonds || {};
			const bondIndex = $(ev.currentTarget).data('bond-index');
			await deleteBond(this.actor, bondIndex);
			await this.actor.update({ 'system.resources.bonds': bondsObject });
		});

		// Event listener for keeping track of bond on change
		html.find('.select-bonds').change(async (ev) => {
			const fieldName = $(ev.currentTarget).attr('name');
			const newValue = $(ev.currentTarget).val();

			// Split the fieldName to extract bondIndex
			const parts = fieldName.split('.');
			const bondIndex = parseInt(parts[3]);

			// Get the current bonds array
			const bonds = this.actor.system.resources.bonds || [];

			// Check if the bond object exists at the specified index
			if (bondIndex >= 0 && bondIndex < bonds.length) {
				// Update the bond property based on fieldName
				bonds[bondIndex][parts[4]] = newValue;

				// Update the actor's data with the modified bonds array
				await this.actor.update({ 'system.resources.bonds': bonds });
			}
		});

		document.addEventListener('click', function (event) {
			if (event.target.dataset.action === 'toggleVisibility') {
				const targetId = event.target.dataset.target;
				const targetElement = document.querySelector(`[data-target="${targetId}"]`);

				// Check your condition here and toggle visibility accordingly
				if (targetElement) {
					targetElement.style.display = 'block'; // Show the element
				} else {
					targetElement.style.display = 'none'; // Hide the element
				}
			}
		});

		// Event listener for editing skill value
		$('.items-list').on('change', '.item-level span', async (ev) => {
			console.log('Whoopsie Poopsie!');
			const newValue = parseInt($(ev.target).text());
			const skillItem = $(ev.target).closest('.item');

			// Find the corresponding skill ID from the data-item-id attribute
			const skillId = skillItem.data('item-id');

			// Get the item object corresponding to the skill using the skill ID
			const item = this.actor.items.get(skillId);

			console.log('Test:', newValue, skillItem, skillId, item);

			if (item) {
				// Update the skill value
				item.system.level.value = newValue;

				// Update the stars based on the updated value
				const starsContainer = skillItem.find('.star-container');
				if (starsContainer.length > 0) {
					const starsHTML = generateStarsHTML(item.system.level.value, item.system.level.max);
					starsContainer.html(starsHTML);
				}

				// Update the actor's item with the modified skill data
				await item.update({ 'system.level.value': newValue });
			}
		});

		// Function to generate the HTML for stars
		function generateStarsHTML(value, max) {
			let starsHTML = '';

			for (let i = 0; i < max; i++) {
				starsHTML += `<div class="star ${i < value ? 'fus-sl-star' : 'ful-sl-star'}"></div>`;
			}

			return starsHTML;
		}

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
		const data = duplicate(header.dataset);
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
		const behaviors = this.actor.items.filter((item) => ['weapon', 'shield', 'armor', 'accessory', 'spell', 'miscAbility', 'behavior'].includes(item.type) && item.system.isBehavior?.value);

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

	/**
	 * Performs a check (rollcheck or rollinit) based on the selected primary/secondary selection and displays the result in a chat message.
	 * @private
	 * @param {string} rollType - The type of check to perform (either 'rollcheck' or 'rollinit').
	 */
	async _openCheck(rollType) {
		let primaryAttributeRef = '';
		let secondaryAttributeRef = '';
		let title = '';
		let bonuses = '';
		const actorData = this.actor.system;

		// Use a switch statement to handle different cases based on rollType
		switch (rollType) {
			case 'roll-check':
				// Get the selected primary and secondary attributes for rollcheck
				primaryAttributeRef = $('select[name="system.rollInfo.attributes.primary.value"]').val();
				secondaryAttributeRef = $('select[name="system.rollInfo.attributes.secondary.value"]').val();
				title = game.i18n.localize('FU.RollCheck');
				bonuses = 0;
				break;

			case 'roll-init':
				// Get the selected primary and secondary attributes for initiative
				primaryAttributeRef = 'attributes.dex.current';
				secondaryAttributeRef = 'attributes.ins.current';
				title = game.i18n.localize('FU.InitiativeCheck');
				bonuses = +actorData.derived.init.value;
				break;

			default:
				// Handle other cases or invalid rollType values
				return;
		}

		// Extract the attribute values from the actor's data
		const primaryAttributeValue = getProperty(actorData, primaryAttributeRef);
		const secondaryAttributeValue = getProperty(actorData, secondaryAttributeRef);

		// Assuming primaryAttributeRef and secondaryAttributeRef are in the format 'attributes.xxx.current'
		const primaryAttributeParts = primaryAttributeRef.split('.');
		const secondaryAttributeParts = secondaryAttributeRef.split('.');

		// Assuming the parts after 'attributes.' match your attribute keys (e.g., 'dex', 'ins', etc.)
		const primaryAttributeKey = primaryAttributeParts[1];
		const secondaryAttributeKey = secondaryAttributeParts[1];

		// Localize the attribute names using your localization data (using abbreviations)
		const primaryAttributeName = game.i18n.localize(CONFIG.FU.attributeAbbreviations[primaryAttributeKey]) ?? primaryAttributeKey;
		const secondaryAttributeName = game.i18n.localize(CONFIG.FU.attributeAbbreviations[secondaryAttributeKey]) ?? secondaryAttributeKey;

		// Perform the roll calculation here using the extracted attribute values
		const primaryRollResult = await new Roll(`1d${primaryAttributeValue}`).evaluate({ async: true });
		const secondaryRollResult = await new Roll(`1d${secondaryAttributeValue}`).evaluate({ async: true });

		// Calculate the total result
		const totalResult = primaryRollResult.total + secondaryRollResult.total + bonuses;

		// Prepare chat data for displaying the message
		const speaker = ChatMessage.getSpeaker({ actor: this.actor });
		const label = `
		<div class="title-desc">
		  <div class="flex-group-center backgroundstyle">
			<p>${title}</p>
		  </div>
		</div>
	  `;

		// Check if Dice So Nice is enabled
		if (game.modules.get('dice-so-nice')?.active) {
			// Prepare data for 3D animation
			const diceData = {
				throws: [
					{
						dice: [
							{
								result: primaryRollResult.total,
								resultLabel: primaryRollResult.total,
								type: `d${primaryAttributeValue}`, // Use primary attribute value
								vectors: [],
								options: {},
							},
							{
								result: secondaryRollResult.total,
								resultLabel: secondaryRollResult.total,
								type: `d${secondaryAttributeValue}`, // Use secondary attribute value
								vectors: [],
								options: {},
							},
						],
					},
				],
			};

			// Show the 3D animation
			await game.dice3d.show(diceData, game.user, false, null, false);
		}

		// Create a chat message
		const bonusString = bonuses === 0 ? '' : `Bonus: ${bonuses} <br>`;
		const content = `
		
		<div class="detail-desc flex-group-center grid grid-2col">
          <div class="summary">${primaryRollResult.total} (${primaryAttributeName})</div>
          <div class="summary">${secondaryRollResult.total} (${secondaryAttributeName})</div> 
        </div>
		<div class="detail-desc flexrow" style="padding:0 2px">
            <div class="summary">${bonusString}Total Result: ${totalResult}</div>
        </div>
	
		`;

		ChatMessage.create({
			speaker: speaker,
			rollMode: game.settings.get('core', 'rollMode'),
			flavor: label,
			content: content,
			flags: {},
		});
	}

	_onRollCheckOption(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;
		const rollCheck = game.i18n.localize('FU.RollCheck');
		const rollCheckOption = game.i18n.localize('FU.RollCheckOptions');

		const dialogContent = `
			<p>Dialog for customizing Roll Check.</p>
			<button id="roll-check-button">${rollCheck}</button>
		`;

		const bonusBond = 0;
		const bonusExtra = 0;

		// Create the dialog
		const dialog = new Dialog({
			title: `${rollCheckOption}`,
			content: dialogContent,
			buttons: {
				close: {
					label: 'Close',
					callback: () => {
						// Handle any actions on dialog close if needed
					},
				},
			},
			default: 'close', // The default button (close) that responds to the Enter key
		});

		// Render the dialog
		dialog.render(true);

		// Add event listener to the close button (optional)
		const closeDialogButton = dialog.element.find('#close-dialog');
		closeDialogButton.on('click', (event) => {
			event.preventDefault();
			dialog.close();
		});

		// Add event listener to the "Customize Roll Check" button
		const rollCheckButton = dialog.element.find('#roll-check-button');
		rollCheckButton.on('click', (event) => {
			event.preventDefault();
			dialog.close();

			// Call the _openCheck function and pass the bonusBond and bonusExtra variables
			this._openCheck('roll-check', bonusBond, bonusExtra);
		});
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

		// Check if Shift key is pressed
		const isShiftPressed = event.shiftKey;

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				console.log(itemId, item);
				if (item) return item.roll(isShiftPressed); // Pass isShiftPressed as an argument
			}
			if (dataset.rollType === 'behavior') {
				return this._rollBehavior();
			}
			if (dataset.rollType === 'roll-check' || dataset.rollType === 'roll-init') {
				return this._openCheck(dataset.rollType);
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
			if (item) return item.roll();
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
