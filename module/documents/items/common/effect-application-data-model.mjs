/**
 * @typedef ApplyEffectData
 * @property {String[]} entries
 * @property {Boolean} prompt Whether to prompt a selection dialog.
 */

/**
 * @description Used when rolls are performed.
 * @implements ApplyEffectData
 * @property {Boolean} prompt
 * @property {Set<String>} entries
 */
export class EffectApplicationDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, ArrayField, BooleanField } = foundry.data.fields;
		return {
			entries: new ArrayField(new StringField({ nullable: true })),
			prompt: new BooleanField(),
		};
	}
}
