import { FU } from '../../helpers/config.mjs';

/**
 * @description THe active effect model for this system
 * @property duration.event The combat event which decrements the duration. Once it reaches 0, the effect is over.
 * @property duration.interval The number of occurrences between events
 * @property duration.remaining The number of intervals left.
 * @remarks The remaining property is initialized, and must be updated.
 */
export class FUActiveEffectModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { NumberField, SchemaField, StringField } = foundry.data.fields;
		return {
			duration: new SchemaField({
				event: new StringField({ initial: 'endOfTurn', choices: Object.keys(FU.effectDuration) }),
				interval: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
				remaining: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			}),
			stack: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
		};
	}
}

export class ActiveEffectPredicate {}
