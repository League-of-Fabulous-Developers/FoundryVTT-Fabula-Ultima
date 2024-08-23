export class EquipmentHandler {
	constructor(actor) {
		this.actor = actor;
	}

	/**
	 * Handles item click events, equipping or unequipping items based on the click type.
	 *
	 * @param {Event} ev - The click event triggering the item click.
	 * @param {string} clickType - Indicates the type of click event: 'left', 'right', or 'ctrl'.
	 * @returns {void}
	 */
	async handleItemClick(ev, clickType) {
		const li = $(ev.currentTarget).closest('.item');
		const itemId = li.data('itemId');
		const item = this.actor.items.get(itemId);

		if (!item) return;

		const monkeyGrip = this.actor.getSingleItemByFuid('monkey-grip');
		const dualShield = this.actor.getSingleItemByFuid('dual-shieldbearer');
		const equippedData = foundry.utils.deepClone(this.actor.system.equipped);

		const itemType = item.type;
		const itemHand = item.system.hands?.value;

		const slot = this.determineSlot(itemType, clickType, dualShield);
		if (!slot) return;

		const twoHandedWeaponEquipped = this.isTwoHandedWeaponEquipped(equippedData);
		const dualShieldActive = dualShield !== null;

		if (itemType === 'weapon' && clickType === 'ctrl') {
			await this.handlePhantomSlot(itemId, equippedData, li, item);
		} else if (itemType === 'weapon' && itemHand === 'two-handed') {
			await this.handleTwoHandedWeapon(itemId, equippedData, monkeyGrip, slot);
		} else if (itemType === 'shield') {
			await this.handleShield(itemId, equippedData, dualShieldActive, monkeyGrip, clickType, slot);
		} else {
			await this.handleOtherItems(itemId, equippedData, twoHandedWeaponEquipped, clickType, slot);
		}

		await this.actor.update({ 'system.equipped': equippedData });
		this.updateItemIcon(li, item, equippedData[slot]);

		if (clickType === 'right') ev.preventDefault();
	}

	// Determine which slot to use based on item type and click type
	determineSlot(itemType, clickType, dualShield) {
		const slotLookup = {
			weapon: clickType === 'ctrl' ? 'phantom' : clickType === 'right' ? 'offHand' : 'mainHand',
			shield: clickType === 'right' && dualShield ? 'mainHand' : 'offHand',
			armor: 'armor',
			accessory: 'accessory',
		};
		return slotLookup[itemType] || null;
	}

	// Check if a two-handed weapon is equipped
	isTwoHandedWeaponEquipped(equippedData) {
		return equippedData.mainHand && equippedData.offHand && this.actor.items.get(equippedData.mainHand)?.system.hands.value === 'two-handed';
	}

	// Handle equipping and unequipping items in the phantom slot
	async handlePhantomSlot(itemId, equippedData, li, item) {
		if (equippedData.phantom === itemId) {
			equippedData.phantom = null;
		} else {
			equippedData.phantom = itemId;
			if (equippedData.mainHand === itemId) equippedData.mainHand = null;
			if (equippedData.offHand === itemId) equippedData.offHand = null;
		}
		await this.actor.update({ 'system.equipped': equippedData });
		this.updateItemIcon(li, item, equippedData.phantom);
	}

	// Handle equipping and unequipping two-handed weapons
	async handleTwoHandedWeapon(itemId, equippedData, monkeyGrip, slot) {
		if (equippedData.mainHand === itemId && equippedData.offHand === itemId) {
			equippedData.mainHand = null;
			equippedData.offHand = null;
		} else {
			if (monkeyGrip) {
				equippedData[slot] = equippedData[slot] === itemId ? null : itemId;
				if (slot === 'mainHand' && equippedData.offHand === itemId) equippedData.offHand = null;
				if (slot === 'offHand' && equippedData.mainHand === itemId) equippedData.mainHand = null;
			} else {
				equippedData.mainHand = itemId;
				equippedData.offHand = itemId;
			}
		}
	}

	// Handle equipping and unequipping shields
	async handleShield(itemId, equippedData, dualShieldActive, monkeyGrip, clickType, slot) {
		if (dualShieldActive) {
			equippedData[slot] = equippedData[slot] === itemId ? null : itemId;
			if (slot === 'mainHand' && equippedData.offHand === itemId) equippedData.offHand = null;
			if (slot === 'offHand' && equippedData.mainHand === itemId) equippedData.mainHand = null;
		} else {
			if (clickType === 'right') {
				equippedData[slot] = null;
			} else {
				if (slot === 'mainHand' && !monkeyGrip) return;
				equippedData[slot] = equippedData[slot] === itemId ? null : itemId;
				if (slot === 'mainHand' && equippedData.offHand === itemId) equippedData.offHand = null;
				if (slot === 'offHand' && equippedData.mainHand === itemId) equippedData.mainHand = null;
			}
		}
	}

	// Handle other item types
	async handleOtherItems(itemId, equippedData, twoHandedWeaponEquipped, clickType, slot) {
		if (twoHandedWeaponEquipped && clickType === 'right') {
			equippedData.mainHand = null;
			equippedData.offHand = null;
		}
		equippedData[slot] = equippedData[slot] === itemId ? null : itemId;
		if (slot === 'mainHand' || slot === 'offHand') {
			if (equippedData.mainHand === equippedData.offHand) {
				equippedData.mainHand = null;
				equippedData.offHand = null;
			}
		}
	}

	// Update the icon in the UI for the item, based on its equipped state
	updateItemIcon(li, item, equippedItemId) {
		const icon = li.find('.item-icon');
		const isEquipped = equippedItemId === item.id;
		icon.removeClass('fa-circle fa-toolbox ra-sword ra-relic-blade ra-shield ra-helmet fas fa-leaf');

		if (isEquipped) {
			icon.addClass(this.getIconClassForEquippedItem(item));
		} else {
			icon.addClass('fa-circle');
		}
	}

	// Determine the appropriate icon class for an equipped item based on its type and properties
	getIconClassForEquippedItem(item) {
		if (item.type === 'weapon') {
			return item.system.hands.value === 'two-handed' ? 'ra ra-relic-blade ra-2x' : 'ra ra-sword ra-2x';
		} else if (item.type === 'shield') {
			return 'ra ra-shield ra-2x';
		} else if (item.type === 'armor') {
			return 'ra ra-helmet ra-2x';
		} else if (item.type === 'accessory') {
			return 'fas fa-leaf ra-2x';
		}
		return 'fa-circle';
	}
}
