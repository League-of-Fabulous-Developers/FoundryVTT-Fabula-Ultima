import {ProgressDataModel} from '../common/progress-data-model.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {"minor", "medium","major", "extreme"} potency.value
 * @property {"individual", "small", "large", "huge"} area.value
 * @property {"consumable", "permanent"} use.value
 * @property {boolean} isFlawed.value
 * @property {number} defectMod.value
 * @property {number} numTinker.value
 * @property {number} numHelper.value
 * @property {number} lvlVision.value
 * @property {number} cost.value
 * @property {number} progressPerDay.value
 * @property {number} days.value
 * @property {number} discount.value
 * @property {number} clock.value
 * @property {string} clock.value
 */
export class ProjectDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'medium', 'major', 'extreme'] }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: ['individual', 'small', 'large', 'huge'] }) }),
			use: new SchemaField({ value: new StringField({ initial: 'consumable', choices: ['consumable', 'permanent'] }) }),
			isFlawed: new SchemaField({ value: new BooleanField() }),
			defectMod: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			numTinker: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			numHelper: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			lvlVision: new SchemaField({ value: new NumberField({ initial: 0, min: 0, max: 5, integer: true, nullable: false }) }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			progressPerDay: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			days: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			discount: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			clock: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
