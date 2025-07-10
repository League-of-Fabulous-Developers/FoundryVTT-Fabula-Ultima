import { HTMLUtils } from './html-utils.mjs';

export class EquipmentHandler {
	constructor(actor) {
		this.actor = actor;
	}

	/**
	 * Handles item click events, equipping or unequipping items based on the click type.
	 *
	 * @param {PointerEvent} ev - The click event triggering the item click.
	 * @param {HTMLElement} target
	 * @returns {void}
	 */
	async handleItemClick(ev, target) {
		ev.preventDefault();
		const li = HTMLUtils.findWithDataset(target);

		if (!li) return;

		const itemId = li.dataset.id;
		const item = this.actor.items.get(itemId);

		if (!item) return;

		const equippedData = this.actor.system.equipped.toObject();

		const itemType = item.type;

		if (itemType === 'weapon') {
			this.handleWeapon(item, equippedData, ev);
		} else if (itemType === 'shield') {
			this.handleShield(item, equippedData, ev);
		} else if (itemType === 'armor') {
			this.handleArmor(item, equippedData, ev);
		} else if (itemType === 'accessory') {
			this.handleAccessory(item, equippedData, ev);
		} else {
			// unsupported item type
			return;
		}

		this.autoEquipUnarmedStrike(equippedData);
		await this.actor.update({ 'system.equipped': equippedData });
	}

	handleWeapon(item, equippedData, event) {
		const unequipped = [];
		if (equippedData.mainHand === item.id) {
			equippedData.mainHand = null;
			unequipped.push('mainHand');
		}
		if (equippedData.offHand === item.id) {
			equippedData.offHand = null;
			unequipped.push('offHand');
		}
		if (equippedData.phantom === item.id) {
			equippedData.phantom = null;
			unequipped.push('phantom');
		}

		const monkeyGrip = this.actor.getSingleItemByFuid('monkey-grip');
		if (item.system.hands.value === 'one-handed' || monkeyGrip) {
			if (event.ctrlKey && !unequipped.includes('phantom')) {
				equippedData.phantom = item.id;
			} else if (event.button === 2 /* right click */ && !unequipped.includes('offHand')) {
				const previouslyEquipped = this.actor.items.get(equippedData.offHand);
				if (previouslyEquipped && previouslyEquipped.system?.hands.value === 'two-handed') {
					equippedData.mainHand = null;
				}
				equippedData.offHand = item.id;
			} else if (!unequipped.includes('mainHand')) {
				const previouslyEquipped = this.actor.items.get(equippedData.offHand);
				if (previouslyEquipped && previouslyEquipped.system?.hands.value === 'two-handed') {
					equippedData.offHand = null;
				}
				equippedData.mainHand = item.id;
			}
		} else {
			if (event.ctrlKey && !unequipped.includes('phantom')) {
				equippedData.phantom = item.id;
			} else if (!unequipped.includes('mainHand')) {
				equippedData.mainHand = item.id;
				equippedData.offHand = item.id;
			}
		}
	}

	handleShield(item, equippedData, event) {
		const dualShieldActive = this.actor.getSingleItemByFuid('dual-shieldbearer');

		const unequipped = [];
		if (equippedData.mainHand === item.id) {
			equippedData.mainHand = null;
			unequipped.push('mainHand');
		}
		if (equippedData.offHand === item.id) {
			equippedData.offHand = null;
			unequipped.push('offHand');
		}

		if (dualShieldActive) {
			if (event.button === 0 && !unequipped.includes('mainHand')) {
				equippedData.mainHand = item.id;
			} else if (event.button === 2 && !unequipped.includes('offHand')) {
				equippedData.offHand = item.id;
			}
		} else if (!unequipped.includes('offHand')) {
			equippedData.offHand = item.id;
		}
	}

	handleArmor(item, equippedData, ev) {
		if (equippedData.armor === item.id) {
			equippedData.armor = null;
		} else {
			equippedData.armor = item.id;
		}
	}

	handleAccessory(item, equippedData, ev) {
		if (equippedData.accessory === item.id) {
			equippedData.accessory = null;
		} else {
			equippedData.accessory = item.id;
		}
	}

	autoEquipUnarmedStrike(equippedData) {
		const unarmedStrike = this.actor.getSingleItemByFuid('unarmed-strike');
		if (!unarmedStrike) return;

		// If main hand is empty, equip unarmed strike
		if (!equippedData.mainHand) {
			equippedData.mainHand = unarmedStrike.id;
		}
		// If off hand is empty, equip unarmed strike
		if (!equippedData.offHand) {
			equippedData.offHand = unarmedStrike.id;
		}
	}
}
