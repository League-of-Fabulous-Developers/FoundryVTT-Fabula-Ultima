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

		const { armor: armors, accessory: acessories, shield: shields } = actor.itemTypes;

		let equipmentDef = 0;
		let equipmentMdef = 0;

		acessories
			.filter((item) => item.system.isEquipped.value)
			.forEach((accessory) => {
				equipmentDef += accessory.system.def.value;
				equipmentMdef += accessory.system.mdef.value;
			});
		shields
			.filter((item) => item.system.isEquipped.value)
			.forEach((shield) => {
				equipmentDef += shield.system.def.value;
				equipmentMdef += shield.system.mdef.value;
			});

		let defCalculation;
		let mdefCalculation;

		// Find the equipped armor
		/** @type FUItem */
		const armor = armors.find((item) => item.system.isEquipped.value);
		if (armor) {
			/** @type ArmorDataModel */
			const armorData = armor.system;

			equipmentDef += armorData.def.value;
			equipmentMdef += armorData.mdef.value;

			defCalculation = function () {
				return (attributes[armorData.attributes.primary.value]?.current ?? 0) + equipmentDef + data.def.bonus;
			};
			mdefCalculation = function () {
				return (attributes[armorData.attributes.secondary.value]?.current ?? 0) + equipmentMdef + data.mdef.bonus;
			};
		} else {
			defCalculation = function () {
				return attributes.dex.current + equipmentDef + data.def.bonus;
			};
			mdefCalculation = function () {
				return attributes.ins.current + equipmentMdef + data.mdef.bonus;
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
		const { armor: armors, accessory: acessories, shield: shields } = actor.itemTypes;

		let initMod = 0;
		acessories.filter((item) => item.system.isEquipped.value).forEach((accessory) => (initMod += accessory.system.init.value));
		shields.filter((item) => item.system.isEquipped.value).forEach((shield) => (initMod += shield.system.init.value));
		const equippedArmor = armors.find((item) => item.system.isEquipped.value);
		if (equippedArmor) {
			initMod += equippedArmor.system.init.value;
		}

		let initCalculation = function () {
			return initMod + initBonus;
		};

		if (actor.type === 'npc') {
			const eliteOrChampBonus = actor.system.isChampion.value !== 1 ? actor.system.isChampion.value : actor.system.isElite.value ? 2 : 0;
			initCalculation = function () {
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
