import {ProgressDataModel} from '../common/progress-data-model.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} zeroTrigger.value
 * @property {string} zeroTrigger.description
 * @property {string} zeroEffect.value
 * @property {string} zeroEffect.description
 * @property {string} source.value
 */
export class ZeroPowerDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			zeroTrigger: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			zeroEffect: new SchemaField({
				value: new StringField(),
				description: new HTMLField(),
			}),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
