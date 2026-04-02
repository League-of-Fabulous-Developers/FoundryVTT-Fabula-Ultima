import FUApplication from '../ui/application.mjs';
import { systemAssetPath, systemTemplatePath } from './system-utils.mjs';
import { EquipDataModel } from '../documents/actors/common/equip-data-model.mjs';
import FoundryUtils from './foundry-utils.mjs';
import { WeaponResolver } from '../documents/items/skill/weapon-resolver.mjs';

/**
 * @desc Manages equipment for a character.
 */
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
		const li = target.closest('[data-item-id]');

		if (!li) return;

		const itemId = li.dataset.itemId;
		const item = this.actor.items.get(itemId);

		if (!item) return;

		const equippedData = this.actor.system.equipped.toObject();

		const itemType = item.type;

		if (itemType === 'weapon') {
			this.handleWeapon(item, equippedData, ev);
		} else if (itemType === 'customWeapon') {
			this.handleCustomWeapon(item, equippedData, ev);
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

	handleCustomWeapon(item, equippedData, event) {
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

		if (event.ctrlKey && !unequipped.includes('phantom')) {
			equippedData.phantom = item.id;
		} else if (!unequipped.includes('mainHand')) {
			equippedData.mainHand = item.id;
			equippedData.offHand = item.id;
		}
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
				if (previouslyEquipped && (previouslyEquipped.system?.hands?.value === 'two-handed' || previouslyEquipped.type === 'customWeapon')) {
					equippedData.mainHand = null;
				}
				equippedData.offHand = item.id;
			} else if (!unequipped.includes('mainHand')) {
				const previouslyEquipped = this.actor.items.get(equippedData.offHand);
				if (previouslyEquipped && (previouslyEquipped.system?.hands?.value === 'two-handed' || previouslyEquipped.type === 'customWeapon')) {
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

		if (equippedData.mainHand === equippedData.offHand && equippedData.mainHand !== item.id) {
			// two-handed weapon equipped, can't be equipped at the same time as a shield
			equippedData.mainHand = null;
			equippedData.offHand = null;
		}

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

/**
 * @desc A dialog used for switching equipment on an actor.
 */
export class EquipmentHandlerDialog extends FUApplication {
	static DEFAULT_OPTIONS = {
		window: {
			title: 'FU.Equipment',
			icon: 'ra ra-vest',
			resizable: false,
		},
		position: {
			width: 680,
			height: 'auto',
		},
		actions: {
			switch: this.#switchEquipment,
		},
	};

	static PARTS = {
		main: {
			template: systemTemplatePath('ui/equipment-handler'),
		},
	};

	#actor;
	#slots;
	#weapons;
	#accessories;
	#armors;

	constructor(actor) {
		super();
		this.#actor = actor;
		this.#slots = EquipDataModel.getSlottedEquipment(actor);
		this.#weapons = WeaponResolver.getEquippedWeapons(actor, true);
		this.#armors = actor.getItemsByType('armor');
		this.#accessories = actor.getItemsByType('accessory');
	}

	/** @type {FUActor} **/
	get actor() {
		return this.#actor;
	}

	/**
	 * @returns {CharacterEquipment}
	 */
	get slots() {
		return this.#slots;
	}

	/**
	 * @returns {EquipDataModel|*}
	 */
	get equipped() {
		return this.actor.system.equipped;
	}

	/** @override */
	async _prepareContext(options) {
		return {
			slots: {
				mainHand: { label: 'FU.MainHand', current: this.slots.mainHand, items: this.slots.mainHand },
				offHand: { label: 'FU.OffHand', current: this.slots.offHand, items: this.slots.offHand },
				armor: { label: 'FU.Armor', current: this.slots.armor, items: this.slots.armor },
				accessory: { label: 'FU.Accessory', current: this.slots.accessory, items: this.slots.accessory },
			},
			dollImage: systemAssetPath('ui/equipment-doll.png'),
		};
	}

	/**
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'main':
				{
					FoundryUtils.itemContextMenu(element, '[data-context-menu="mainHand"]', this.#weapons, (item) => {
						ui.notifications.info(`Switching main hand to ${item.name}`);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="offHand"]', this.#weapons, (item) => {
						ui.notifications.info(`Switching offhand hand to ${item.name}`);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="armor"]', this.#armors, (item) => {
						ui.notifications.info(`Switching armor to ${item.name}`);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="accessory"]', this.#accessories, (item) => {
						ui.notifications.info(`Switching accessory to ${item.name}`);
					});
				}
				break;
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #switchEquipment(event, target) {
		// TODO: Switch equipment
	}
}
