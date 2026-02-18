/**
 * @typedef ApplyEffectData
 * @property {String[]} entries
 * @property {Boolean} prompt Whether to prompt a selection dialog.
 * @property {FUActiveEffectDuration} duration
 */

import { FU } from '../../../helpers/config.mjs';

/**
 * @description Used when rolls are performed.
 * @implements ApplyEffectData
 * @property {Boolean} prompt
 * @property {FUActiveEffectDuration} duration
 * @property {Set<String>} entries
 */
export class EffectApplicationDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, SchemaField, ArrayField, BooleanField, NumberField } = foundry.data.fields;
		return {
			entries: new ArrayField(new StringField({ nullable: true })),
			prompt: new BooleanField(),
			duration: new SchemaField({
				event: new StringField({ initial: '', blank: true, choices: Object.keys(FU.effectDuration) }),
				interval: new NumberField({ min: 0, blank: true, integer: true }),
				tracking: new StringField({ initial: '', blank: true, choices: Object.keys(FU.effectTracking) }),
			}),
		};
	}
}
