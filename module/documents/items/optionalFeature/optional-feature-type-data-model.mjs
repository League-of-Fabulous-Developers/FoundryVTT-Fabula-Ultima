import { OptionalDataField } from './optional-data-field.mjs';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';

export class OptionalFeatureTypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField } = foundry.data.fields;
		return {
			summary: new SchemaField({ value: new StringField() }),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			optionalType: new StringField({
				nullable: false,
				initial: () => Object.keys(CONFIG.FU.optionalFeatureRegistry?.optionals() ?? {})[0],
				choices: () => Object.keys(CONFIG.FU.optionalFeatureRegistry?.optionals() ?? {}),
			}),
			data: new OptionalDataField('optionalType'),
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

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.data instanceof RollableOptionalFeatureDataModel) {
			return this.data.constructor.roll(this.data, this.parent, modifiers.shift);
		} else {
			return ChecksV2.display(this.parent.actor, this.parent);
		}
	}
}
