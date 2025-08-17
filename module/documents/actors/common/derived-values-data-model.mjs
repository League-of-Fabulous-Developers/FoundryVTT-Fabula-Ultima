import { ShieldDataModel } from '../../items/shield/shield-data-model.mjs';
import { CustomWeaponDataModel } from '../../items/customWeapon/custom-weapon-data-model.mjs';

/**
 * @property {number} init.value
 * @property {number} init.bonus
 * @property {number} def.value
 * @property {number} def.bonus
 * @property {number} mdef.value
 * @property {number} mdef.bonus
 */
export class DerivedValuesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, NumberField } = foundry.data.fields;
		return {
			init: new SchemaField({
				bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			def: new SchemaField({
				bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			mdef: new SchemaField({
				bonus: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
		};
	}

	prepareData() {
		const actor = this.parent.actor;
		this.#prepareDefenses(actor);
		this.#prepareInitiative(actor);
	}

	/**
	 * @param {FUActor} actor
	 */
	#prepareDefenses(actor) {
		/** @type AttributesDataModel */
		const attributes = actor.system.attributes;
		const data = this;
		const equippedItems = actor.system.equipped;
		const vehicle = actor.system.vehicle;

		let equipmentDef = 0;
		let equipmentMdef = 0;

		if (equippedItems.accessory) {
			const accessory = actor.items.get(equippedItems.accessory);
			if (accessory) {
				equipmentDef += accessory.system.def.value;
				equipmentMdef += accessory.system.mdef.value;
			}
		}

		if (vehicle && vehicle.weaponsActive) {
			// Vehicle Weapon Modules override Hand Slots
			vehicle.weapons
				.filter((weapon) => weapon.system.data.isShield)
				.forEach((shieldModule) => {
					equipmentDef += shieldModule.system.data.shield.defense;
					equipmentMdef += shieldModule.system.data.shield.magicDefense;
				});
		} else {
			// Hand Slots
			if (equippedItems.mainHand) {
				const mainHandItem = actor.items.get(equippedItems.mainHand);
				if (mainHandItem && mainHandItem.type === 'shield') {
					equipmentDef += mainHandItem.system.def.value;
					equipmentMdef += mainHandItem.system.mdef.value;
				}
				if (mainHandItem && mainHandItem.system instanceof CustomWeaponDataModel) {
					equipmentDef += mainHandItem.system.def;
					equipmentMdef += mainHandItem.system.mdef;
				}
			}
			if (equippedItems.offHand && equippedItems.offHand !== equippedItems.mainHand) {
				const offHandItem = actor.items.get(equippedItems.offHand);
				if (offHandItem && offHandItem.type === 'shield') {
					equipmentDef += offHandItem.system.def.value;
					equipmentMdef += offHandItem.system.mdef.value;
				}
			}
		}

		let defCalculation;
		let mdefCalculation;

		const ignoredRanks = new Set(['custom']);
		const includeAttribute = !(actor.type === 'npc' && ignoredRanks.has(actor.system.rank.value));

		// Find the equipped armor
		/** @type FUItem */
		const armor = actor.items.get(equippedItems.armor);
		if (vehicle && vehicle.armorActive) {
			/** @type ArmorModuleDataModel */
			const armorData = vehicle.armor.system.data;

			equipmentDef += armorData.defense.modifier;
			equipmentMdef += armorData.magicDefense.modifier;

			if (armorData.martial) {
				defCalculation = function () {
					return equipmentDef + data.def.bonus;
				};
				mdefCalculation = function () {
					return equipmentMdef + data.mdef.bonus;
				};
			} else {
				const attrDef = includeAttribute ? attributes[armorData.defense.attribute]?.current ?? 0 : 0;
				const attrMdef = includeAttribute ? attributes[armorData.magicDefense.attribute]?.current ?? 0 : 0;

				defCalculation = function () {
					return attrDef + equipmentDef + data.def.bonus;
				};
				mdefCalculation = function () {
					return attrMdef + equipmentMdef + data.mdef.bonus;
				};
			}
		} else if (armor) {
			const armorData = armor.system;

			equipmentDef += armorData.def.value;
			equipmentMdef += armorData.mdef.value;

			const attrDef = includeAttribute ? attributes[armorData.attributes.primary.value]?.current ?? 0 : 0;
			const attrMdef = includeAttribute ? attributes[armorData.attributes.secondary.value]?.current ?? 0 : 0;

			defCalculation = function () {
				return attrDef + equipmentDef + data.def.bonus;
			};
			mdefCalculation = function () {
				return attrMdef + equipmentMdef + data.mdef.bonus;
			};
		} else {
			const attrDex = includeAttribute ? attributes.dex.current : 0;
			const attrIns = includeAttribute ? attributes.ins.current : 0;

			defCalculation = function () {
				return attrDex + equipmentDef + data.def.bonus;
			};
			mdefCalculation = function () {
				return attrIns + equipmentMdef + data.mdef.bonus;
			};
		}

		Object.defineProperty(this.def, 'value', {
			configurable: true,
			enumerable: true,
			get: defCalculation,
			set(newValue) {
				delete this.value;
				this.value = newValue;
			},
		});

		Object.defineProperty(this.mdef, 'value', {
			configurable: true,
			enumerable: true,
			get: mdefCalculation,
			set(newValue) {
				delete this.value;
				this.value = newValue;
			},
		});
	}

	/**
	 * @param {FUActor} actor
	 */
	#prepareInitiative(actor) {
		const initBonus = this.init.bonus;
		const equippedItems = actor.system.equipped;

		let initMod = 0;
		if (equippedItems.accessory) {
			const accessory = actor.items.get(equippedItems.accessory);
			if (accessory) {
				initMod += accessory.system.init.value;
			}
		}

		if (!actor.system.vehicle?.weaponsActive) {
			if (equippedItems.mainHand) {
				const shield = actor.items.get(equippedItems.mainHand);
				if (shield && shield.system instanceof ShieldDataModel) {
					initMod += shield.system.init.value;
				}
			}
			if (equippedItems.offHand) {
				const shield = actor.items.get(equippedItems.offHand);
				if (shield && shield.system instanceof ShieldDataModel) {
					initMod += shield.system.init.value;
				}
			}
		}
		if (!actor.system.vehicle?.armorActive) {
			if (equippedItems.armor) {
				const armor = actor.items.get(equippedItems.armor);
				if (armor) {
					initMod += armor.system.init.value;
				}
			}
		}

		let initCalculation = function () {
			return initMod + initBonus;
		};

		if (actor.type === 'npc') {
			const eliteOrChampBonus = actor.system.rank.value === 'soldier' ? 0 : actor.system.rank.replacedSoldiers;
			initCalculation = function () {
				if (actor.system.rank.value === 'companion' || actor.system.rank.value === 'custom') {
					return 0;
				}
				return initMod + initBonus + (actor.system.attributes.dex.base + actor.system.attributes.ins.base) / 2 + eliteOrChampBonus;
			};
		}

		Object.defineProperty(this.init, 'value', {
			configurable: true,
			enumerable: true,
			get: initCalculation,
			set(newValue) {
				delete this.value;
				this.value = newValue;
			},
		});
	}
}
