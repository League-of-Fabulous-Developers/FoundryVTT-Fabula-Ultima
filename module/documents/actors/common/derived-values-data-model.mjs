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
		// Define 'value' properties
		Object.defineProperty(this.def, 'value', {
			configurable: true,
			enumerable: true,
			get: () => DerivedValuesDataModel.calculateDefense(actor, this),
			set(newValue) {
				delete this.value;
				this.value = newValue;
			},
		});

		Object.defineProperty(this.mdef, 'value', {
			configurable: true,
			enumerable: true,
			get: () => DerivedValuesDataModel.calculateMagicDefense(actor, this),
			set(newValue) {
				delete this.value;
				this.value = newValue;
			},
		});
	}

	/**
	 * @param {'def'|'mdef'} type
	 * @param {Actor} actor
	 * @param {DerivedValuesDataModel} data
	 * @returns {number}
	 */
	static calculateDefenseType(type, actor, data) {
		const attributes = actor.system.attributes;
		const equippedItems = actor.system.equipped;
		const vehicle = actor.system.vehicle;

		const isMagic = type === 'mdef';
		let total = 0;

		const getValue = (item, path) => path.split('.').reduce((o, p) => o?.[p], item?.system) ?? 0;

		// Accessory
		if (equippedItems.accessory) {
			const accessory = actor.items.get(equippedItems.accessory);
			total += getValue(accessory, isMagic ? 'mdef.value' : 'def.value');
		}

		// Vehicle Weapon Modules
		if (vehicle && vehicle.weaponsActive) {
			vehicle.weapons
				.filter((w) => w.system.data.isShield)
				.forEach((shield) => {
					const path = isMagic ? 'data.shield.magicDefense' : 'data.shield.defense';
					total += getValue(shield, path);
				});
		} else {
			// Hand slots
			['mainHand', 'offHand'].forEach((slot) => {
				const itemId = equippedItems[slot];
				const item = actor.items.get(itemId);
				if (item?.type === 'shield') {
					total += getValue(item, isMagic ? 'mdef.value' : 'def.value');
				}
			});
		}

		// Determine if attribute should be included
		const ignoredRanks = new Set(['custom']);
		const includeAttr = !(actor.type === 'npc' && ignoredRanks.has(actor.system.rank.value));

		const armor = actor.items.get(equippedItems.armor);

		if (vehicle && vehicle.armorActive) {
			const armorData = vehicle.armor.system.data;
			total += isMagic ? armorData.magicDefense.modifier : armorData.defense.modifier;

			if (armorData.martial) {
				return Number(total + data[type].bonus);
			} else {
				const attrKey = isMagic ? armorData.magicDefense.attribute : armorData.defense.attribute;
				const attrVal = includeAttr ? attributes[attrKey]?.current ?? 0 : 0;
				return Number(attrVal + total + data[type].bonus);
			}
		} else if (armor) {
			const armorData = armor.system;
			total += isMagic ? armorData.mdef.value : armorData.def.value;
			const attrKey = isMagic ? armorData.attributes.secondary.value : armorData.attributes.primary.value;
			const attrVal = includeAttr ? attributes[attrKey]?.current ?? 0 : 0;
			return Number(attrVal + total + data[type].bonus);
		} else {
			const fallbackAttr = isMagic ? attributes.ins.current : attributes.dex.current;
			const attrVal = includeAttr ? fallbackAttr : 0;
			return Number(attrVal + total + data[type].bonus);
		}
	}

	static calculateDefense(actor, data) {
		return this.calculateDefenseType('def', actor, data);
	}

	static calculateMagicDefense(actor, data) {
		return this.calculateDefenseType('mdef', actor, data);
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
				if (shield) {
					initMod += shield.system.init.value;
				}
			}
			if (equippedItems.offHand) {
				const shield = actor.items.get(equippedItems.offHand);
				if (shield) {
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
