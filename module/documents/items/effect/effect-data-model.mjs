/**
 * @property {string} fuid
 * @property {string} summary.value
 */
export class EffectDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			fuid: new StringField(),
		};
	}
}
