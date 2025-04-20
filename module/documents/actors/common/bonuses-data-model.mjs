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
		};
	}
}
