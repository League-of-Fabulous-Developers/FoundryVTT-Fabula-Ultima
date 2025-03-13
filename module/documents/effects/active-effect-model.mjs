import { FU } from '../../helpers/config.mjs';

/**
 * @description THe active effect model for this system
 * @property duration.value The duration as a decreasing value.
 * @property duration.event The combat event which decrements the duration. Once it reaches 0, the effect is over.
 */
export class FUActiveEffectModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { NumberField, SchemaField, StringField } = foundry.data.fields;
		return {
			duration: new SchemaField({
				value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
				event: new StringField({ initial: 'endOfTurn', choices: Object.keys(FU.effectDuration) }),
			}),
			stack: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
		};
	}
}

export class ActiveEffectPredicate {}
