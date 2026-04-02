import FUApplication from '../ui/application.mjs';
import { systemAssetPath, systemTemplatePath } from './system-utils.mjs';
import FoundryUtils from './foundry-utils.mjs';
import { FUChatBuilder } from './chat-builder.mjs';
import { CommonSections } from '../checks/common-sections.mjs';

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

		let slot = EquipmentHandler.resolveSlotFromEvent(ev);

		const itemType = item.type;

		if (EquipmentHandler.handleHandEquipment(this.actor, item, equippedData, slot)) {
			/* empty */
		} else if (itemType === 'armor') {
			EquipmentHandler.handleArmor(item, equippedData);
		} else if (itemType === 'accessory') {
			EquipmentHandler.handleAccessory(item, equippedData);
		} else {
			// unsupported item type
			return;
		}
		EquipmentHandler.autoEquipUnarmedStrike(this.actor, equippedData);

		await this.actor.update({ 'system.equipped': equippedData });
	}

	static handleHandEquipment(actor, item, equippedData, slot) {
		const itemType = item.type;
		if (itemType === 'weapon') {
			EquipmentHandler.handleWeapon(actor, item, equippedData, slot);
			return true;
		} else if (itemType === 'customWeapon') {
			EquipmentHandler.handleCustomWeapon(item, equippedData, slot);
			return true;
		} else if (itemType === 'shield') {
			EquipmentHandler.handleShield(actor, item, equippedData, slot);
			return true;
		}
		return false;
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {FUEquipmentSlot}
	 */
	static resolveSlotFromEvent(event) {
		let slot;
		if (event?.ctrlKey) {
			slot = 'phantom';
		} else if (event?.button === 2) {
			slot = 'offHand';
		} else {
			slot = 'mainHand';
		}
		return slot;
	}

	/**
	 * @param {FUItem} item
	 * @param {EquipDataModel} equippedData
	 * @param {FUEquipmentSlot} slot
	 */
	static handleCustomWeapon(item, equippedData, slot) {
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

		if (slot === 'phantom' && !unequipped.includes('phantom')) {
			equippedData.phantom = item.id;
		} else if (!unequipped.includes('mainHand')) {
			equippedData.mainHand = item.id;
			equippedData.offHand = item.id;
		}
	}

	/**
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {EquipDataModel} equippedData
	 * @param {FUEquipmentSlot} slot
	 */
	static handleWeapon(actor, item, equippedData, slot) {
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

		const monkeyGrip = actor.getSingleItemByFuid('monkey-grip');
		if (item.system.hands.value === 'one-handed' || monkeyGrip) {
			if (slot === 'phantom' && !unequipped.includes('phantom')) {
				equippedData.phantom = item.id;
			} else if (slot === 'offHand' /* right click */ && !unequipped.includes('offHand')) {
				const previouslyEquipped = actor.items.get(equippedData.offHand);
				if (previouslyEquipped && (previouslyEquipped.system?.hands?.value === 'two-handed' || previouslyEquipped.type === 'customWeapon')) {
					equippedData.mainHand = null;
				}
				equippedData.offHand = item.id;
			} else if (!unequipped.includes('mainHand')) {
				const previouslyEquipped = actor.items.get(equippedData.offHand);
				if (previouslyEquipped && (previouslyEquipped.system?.hands?.value === 'two-handed' || previouslyEquipped.type === 'customWeapon')) {
					equippedData.offHand = null;
				}
				equippedData.mainHand = item.id;
			}
		} else {
			if (slot === 'phantom' && !unequipped.includes('phantom')) {
				equippedData.phantom = item.id;
			} else if (!unequipped.includes('mainHand')) {
				equippedData.mainHand = item.id;
				equippedData.offHand = item.id;
			}
		}
	}

	/**
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {EquipDataModel} equippedData
	 * @param {FUEquipmentSlot} slot
	 */
	static handleShield(actor, item, equippedData, slot) {
		const dualShieldActive = actor.getSingleItemByFuid('dual-shieldbearer');

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
			if (slot === 'mainHand' && !unequipped.includes('mainHand')) {
				equippedData.mainHand = item.id;
			} else if (slot === 'offHand' && !unequipped.includes('offHand')) {
				equippedData.offHand = item.id;
			}
		} else if (!unequipped.includes('offHand')) {
			equippedData.offHand = item.id;
		}
	}

	/**
	 * @param {FUItem} item
	 * @param {EquipDataModel} equippedData
	 */
	static handleArmor(item, equippedData) {
		if (equippedData.armor === item.id) {
			equippedData.armor = null;
		} else {
			equippedData.armor = item.id;
		}
	}

	/**
	 * @param {FUItem} item
	 * @param {EquipDataModel} equippedData
	 */
	static handleAccessory(item, equippedData) {
		if (equippedData.accessory === item.id) {
			equippedData.accessory = null;
		} else {
			equippedData.accessory = item.id;
		}
	}

	/**
	 * @param {FUActor} actor
	 * @param {EquipDataModel} equippedData
	 */
	static autoEquipUnarmedStrike(actor, equippedData) {
		const unarmedStrike = actor.getSingleItemByFuid('unarmed-strike');
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

	static getHandEquipment(actor) {
		let items = [];
		items.push(...actor.getItemsByType('weapon'));
		items.push(...actor.getItemsByType('customWeapon'));
		// TODO: Support?
		// items.push(
		// 	...actor.getItemsByType('classFeature').filter((cf) => {
		// 		return cf.system.featureType.endsWith('weaponModule') || cf.system.featureType.endsWith('shieldModule');
		// 	}),
		// );
		return items;
	}

	/**
	 * @param {FUActor} actor
	 * @param {EquipDataModel} equippedData
	 */
	static getItems(actor, equippedData) {
		let items = [];
		for (const [, value] of Object.entries(equippedData)) {
			if (value) {
				items.push(actor.items.get(value));
			}
		}
		return items.filter((it) => {
			return it.system.fuid !== 'unarmed-strike';
		});
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
			switchEquipment: this.#switchEquipment,
		},
	};

	static PARTS = {
		main: {
			template: systemTemplatePath('ui/equipment-handler'),
		},
	};

	#actor;
	/** @type EquipDataModel **/
	#equippedData;
	/** @type FUItem[] **/
	#weapons;
	/** @type FUItem[] **/
	#accessories;
	/** @type FUItem[] **/
	#armors;

	constructor(actor) {
		super();
		this.#actor = actor;
		this.#weapons = EquipmentHandler.getHandEquipment(actor);
		this.#armors = actor.getItemsByType('armor');
		this.#accessories = actor.getItemsByType('accessory');

		// Modify a temporary copy
		this.#equippedData = this.actor.system.equipped.toObject();
	}

	/** @type {FUActor} **/
	get actor() {
		return this.#actor;
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
				mainHand: { label: 'FU.MainHand', current: this.actor.items.get(this.#equippedData.mainHand) },
				offHand: { label: 'FU.OffHand', current: this.actor.items.get(this.#equippedData.offHand) },
				armor: { label: 'FU.Armor', current: this.actor.items.get(this.#equippedData.armor) },
				accessory: { label: 'FU.Accessory', current: this.actor.items.get(this.#equippedData.accessory) },
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
						EquipmentHandler.handleHandEquipment(this.actor, item, this.#equippedData, 'mainHand');
						this.render(true);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="offHand"]', this.#weapons, (item) => {
						ui.notifications.info(`Switching offhand hand to ${item.name}`);
						EquipmentHandler.handleHandEquipment(this.actor, item, this.#equippedData, 'offHand');
						this.render(true);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="armor"]', this.#armors, (item) => {
						// TODO: Reject if on a conflict?
						ui.notifications.info(`Switching armor to ${item.name}`);
						EquipmentHandler.handleArmor(item, this.#equippedData);
						this.render(true);
					});
					FoundryUtils.itemContextMenu(element, '[data-context-menu="accessory"]', this.#accessories, (item) => {
						ui.notifications.info(`Switching accessory to ${item.name}`);
						EquipmentHandler.handleAccessory(item, this.#equippedData);
						this.render(true);
					});
				}
				break;
		}
	}

	/**
	 * @this EquipmentHandlerDialog
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #switchEquipment(event, target) {
		// TODO: Chat message
		await this.actor.update({ 'system.equipped': this.#equippedData });
		const chatBuilder = new FUChatBuilder(this.actor);
		CommonSections.template(chatBuilder.sections, 'chat/chat-equipment-change', {
			actor: this.#actor,
			items: EquipmentHandler.getItems(this.actor, this.#equippedData),
		});

		await chatBuilder.create();
	}
}
