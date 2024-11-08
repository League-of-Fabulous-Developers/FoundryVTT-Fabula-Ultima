import { AccuracyBonusesDataModel } from './accuracy-bonuses-data-model.mjs';
import { DamageBonusesDataModel } from './damage-bonuses-data-model.mjs';

/**
 * @property {number} bondStrength
 * @property {number} incomingRecovery.hp
 * @property {number} incomingRecovery.mp
 * @property {number} incomingRecovery.ip
 * @property {number} outgoingRecovery.hp
 * @property {number} outgoingRecovery.mp
 * @property {number} outgoingRecovery.ip
 * @property {AccuracyBonusesDataModel} accuracy
 * @property {DamageBonusesDataModel} damage
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
			outgoingRecovery: new SchemaField({
				hp: new NumberField({ initial: 0, integer: true }),
				mp: new NumberField({ initial: 0, integer: true }),
				ip: new NumberField({ initial: 0, integer: true }),
			}),
			accuracy: new EmbeddedDataField(AccuracyBonusesDataModel, {}),
			damage: new EmbeddedDataField(DamageBonusesDataModel, {}),
		};
	}
}
