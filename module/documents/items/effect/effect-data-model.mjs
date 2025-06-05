import { FUItemDataModel } from '../item-data-model.mjs';

/**
 * @property {string} fuid
 * @property {string} summary.value
 */
export class EffectDataModel extends FUItemDataModel {
	static defineSchema() {
		const { StringField, SchemaField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			cost: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
		};
	}
}
