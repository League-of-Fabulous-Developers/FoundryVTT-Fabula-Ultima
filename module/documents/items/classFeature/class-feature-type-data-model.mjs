import { FeatureDataField } from './feature-data-field.mjs';

export class ClassFeatureTypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField } = foundry.data.fields;
		return {
			summary: new SchemaField({ value: new StringField() }),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			featureType: new StringField({
				nullable: false,
				initial: () => Object.keys(CONFIG.FU.classFeatureRegistry?.features() ?? {})[0],
				choices: () => Object.keys(CONFIG.FU.classFeatureRegistry?.features() ?? {}),
			}),
			data: new FeatureDataField('featureType'),
		};
	}

	prepareDerivedData() {
		this.data?.prepareData();
	}

	/**
	 * For default item chat messages to pick up description.
	 * @return {*}
	 */
	get description() {
		return this.data.description;
	}
}
