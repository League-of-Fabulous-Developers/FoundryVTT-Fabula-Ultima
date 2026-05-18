import { AccuracyBonusesDataModel } from './accuracy-bonuses-data-model.mjs';
import { DamageBonusesDataModel } from './damage-bonuses-data-model.mjs';

/**
 * @typedef ResourceSchema
 * @property {Number} hp
 * @property {Number} mp
 * @property {Number} ip
 */

/**
 * @property {number} bondStrength
 * @property {ResourceSchema} incomingRecovery
 * @property {ResourceSchema} incomingLoss
 * @property {ResourceSchema} outgoingRecovery
 * @property {AccuracyBonusesDataModel} accuracy
 * @property {DamageBonusesDataModel} incomingDamage
 * @property {DamageBonusesDataModel} damage
 * @property {Number} turns Number of additional turns this character can take each round
 */
export class BonusesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, SchemaField, EmbeddedDataField } = foundry.data.fields;
		return {
			bondStrength: new NumberField({ initial: 0, min: 0, integer: true }),
			incomingRecovery: new SchemaField({
				hp: new NumberField({ initial: 0, integer: true }),
				mp: new NumberField({ initial: 0, integer: true }),
				ip: new NumberField({ initial: 0, integer: true }),
			}),
			incomingLoss: new SchemaField({
				hp: new NumberField({ initial: 0, integer: true }),
				mp: new NumberField({ initial: 0, integer: true }),
				ip: new NumberField({ initial: 0, integer: true }),
			}),
			outgoingRecovery: new SchemaField({
				hp: new NumberField({ initial: 0, integer: true }),
				mp: new NumberField({ initial: 0, integer: true }),
				ip: new NumberField({ initial: 0, integer: true }),
			}),
			accuracy: new EmbeddedDataField(AccuracyBonusesDataModel, {}),
			incomingDamage: new EmbeddedDataField(DamageBonusesDataModel, {}),
			damage: new EmbeddedDataField(DamageBonusesDataModel, {}),
			turns: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
		};
	}

	/**
	 * @param {BonusesDataModel} bonuses
	 * @param {CheckType} checkType
	 * @param {WeaponType|undefined} weaponType Only used in accuracy checks.
	 * @returns {CheckModifier[]}
	 */
	static collectCheckBonuses(bonuses, checkType, weaponType = undefined) {
		if (!bonuses) {
			return [];
		}

		/** @type CheckModifier[] **/
		let modifiers = [];

		if (bonuses.accuracy.all) {
			modifiers.push({
				label: 'FU.AllCheckBonus',
				value: bonuses.accuracy.all,
			});
		}

		switch (checkType) {
			case 'accuracy':
				if (bonuses.accuracy.accuracyCheck) {
					modifiers.push({
						label: 'FU.AccuracyCheckBonusGeneric',
						value: bonuses.accuracy.accuracyCheck,
					});
				}
				if (weaponType) {
					if (weaponType === 'melee' && bonuses.accuracy.accuracyMelee) {
						modifiers.push({
							label: 'FU.AccuracyCheckBonusMelee',
							value: bonuses.accuracy.accuracyMelee,
						});
					} else if (weaponType === 'ranged' && bonuses.accuracy.accuracyRanged) {
						modifiers.push({
							label: 'FU.AccuracyCheckBonusRanged',
							value: bonuses.accuracy.accuracyRanged,
						});
					}
				}
				break;

			case 'magic':
				if (bonuses.accuracy.magicCheck) {
					modifiers.push({
						label: 'FU.AccuracyCheckBonusMagic',
						value: bonuses.accuracy.magicCheck,
					});
				}
				break;
		}

		return modifiers;
	}

	/**
	 * @param {BonusesDataModel} bonuses
	 * @param {DamageType} type
	 * @param {WeaponTraits|undefined} weaponTraits
	 * @param {String[]} traits
	 * @returns {DamageModifier[]}
	 */
	static collectDamageBonuses(bonuses, type, weaponTraits = undefined, traits = []) {
		/** @type DamageModifier[] **/
		let modifiers = [];

		// Global Bonus
		const globalBonus = bonuses.damage.all;
		if (globalBonus) {
			modifiers.push({
				label: `FU.DamageBonusAll`,
				amount: globalBonus,
				enabled: true,
			});
		}

		// Damage Type bonus
		const damageTypeBonus = bonuses.damage[type];
		if (damageTypeBonus) {
			modifiers.push({
				label: `FU.DamageBonus${type.capitalize()}`,
				amount: damageTypeBonus,
				enabled: true,
			});
		}

		// Attack Type
		if (weaponTraits) {
			if (weaponTraits.weaponType) {
				const attackTypeBonus = bonuses.damage[weaponTraits.weaponType] ?? 0;
				if (attackTypeBonus) {
					modifiers.push({
						label: `FU.DamageBonusType${weaponTraits.weaponType.capitalize()}`,
						amount: attackTypeBonus,
						enabled: true,
					});
				}
			}
			// Weapon Category
			if (weaponTraits.weaponCategory) {
				const weaponCategoryBonus = bonuses.damage[weaponTraits.weaponCategory] ?? 0;
				if (weaponCategoryBonus) {
					modifiers.push({
						label: `FU.DamageBonusCategory${weaponTraits.weaponCategory.capitalize()}`,
						amount: weaponCategoryBonus,
						enabled: true,
					});
				}
			}
		}

		// Other traits
		for (const trait of traits) {
			const traitBonus = bonuses.damage[trait] ?? 0;
			if (traitBonus) {
				modifiers.push({
					label: `FU.${trait.capitalize()}`,
					amount: traitBonus,
					enabled: true,
				});
			}
		}

		return modifiers;
	}
}

/**
 * @property {ResourceSchema} incomingRecovery
 * @property {ResourceSchema} incomingLoss
 * @property {ResourceSchema} outgoingRecovery
 */
export class MultipliersDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, SchemaField } = foundry.data.fields;
		return {
			incomingRecovery: new SchemaField({
				mp: new NumberField({ initial: 1, integer: true }),
				ip: new NumberField({ initial: 1, integer: true }),
				hp: new NumberField({ initial: 1, integer: true }),
			}),
			incomingLoss: new SchemaField({
				hp: new NumberField({ initial: 1, integer: true }),
				mp: new NumberField({ initial: 1, integer: true }),
				ip: new NumberField({ initial: 1, integer: true }),
			}),
			outgoingRecovery: new SchemaField({
				hp: new NumberField({ initial: 1, integer: true }),
				mp: new NumberField({ initial: 1, integer: true }),
				ip: new NumberField({ initial: 1, integer: true }),
			}),
		};
	}

	static migrateData(source) {
		for (const res of ['hp', 'mp', 'ip']) {
			if (source.incomingRecovery[res] === 0) {
				source.incomingRecovery[res] = 1;
			}
			if (source.incomingLoss[res] === 0) {
				source.incomingLoss[res] = 1;
			}
			if (source.outgoingRecovery[res] === 0) {
				source.outgoingRecovery[res] = 1;
			}
		}
		return super.migrateData(source);
	}
}
