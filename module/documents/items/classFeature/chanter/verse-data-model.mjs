import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { VersesApplication } from './verses-application.mjs';
import { EmbeddedItemUuidField } from '../../../../fields/embedded-item-uuid-field.mjs';
import { systemTemplatePath } from '../../../../helpers/system-utils.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { VerseMigrations } from './verse-migrations.mjs';

const volumes = {
	low: 'FU.ClassFeatureVerseVolumeLow',
	medium: 'FU.ClassFeatureVerseVolumeMedium',
	high: 'FU.ClassFeatureVerseVolumeHigh',
};

/**
 * @param {VerseDataModel} model
 * @returns {Promise<string>}
 */
async function enrichDescription(model) {
	const key = model.key;
	const tone = model.tone;

	if (!tone) {
		return '';
	}
	let rollData;
	if (!key) {
		rollData = (await ToneDataModel.getAdditionalData(tone.system.data)).rollData;
	} else {
		rollData = {};
		const keyData = key.system.data;
		rollData.key = KeyDataModel.getRollData(keyData);

		const actor = model.actor;
		if (actor) {
			rollData.attribute = Object.entries(actor.system.attributes ?? {}).reduce(
				(agg, [key, value]) => ({
					...agg,
					[key]: value.current,
				}),
				{},
			);
		} else {
			rollData.attribute = (await ToneDataModel.getAdditionalData(tone.system.data)).rollData.attribute;
		}
	}

	return TextEditor.enrichHTML(tone.system.data.description, {
		rollData: rollData,
	});
}

/**
 * @extends {RollableClassFeatureDataModel}
 * @property {FUItem|null} key
 * @property {FUItem|null} tone
 * @property {Object} config
 * @property {number} config.low
 * @property {number} config.medium
 * @property {number} config.high
 */
export class VerseDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { SchemaField, NumberField } = foundry.data.fields;
		return {
			key: new EmbeddedItemUuidField({
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof KeyDataModel,
			}),
			tone: new EmbeddedItemUuidField({
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof ToneDataModel,
			}),
			config: new SchemaField({
				low: new NumberField({ initial: 10, min: 0 }),
				medium: new NumberField({ initial: 20, min: 0 }),
				high: new NumberField({ initial: 30, min: 0 }),
			}),
		};
	}

	static migrateData(source) {
		source = super.migrateData(source);
		VerseMigrations.run(source);
		return source;
	}

	static get translation() {
		return 'FU.ClassFeatureVerse';
	}

	static get template() {
		return systemTemplatePath('feature/chanter/feature-verse-sheet');
	}

	static get previewTemplate() {
		return systemTemplatePath('feature/chanter/feature-verse-preview');
	}

	static async getAdditionalData(model) {
		return {
			volumes: volumes,
			keys: model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof KeyDataModel) ?? [],
			tones: model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof ToneDataModel) ?? [],
			description: await enrichDescription(model),
		};
	}

	/**
	 * @param {VerseDataModel} model
	 * @param {FUItem} item
	 * @param {Boolean} isShift
	 */
	static roll(model, item, isShift) {
		new VersesApplication(model).render(true);
	}

	static getTabConfigurations() {
		return [
			{
				group: 'verseTabs',
				navSelector: '.verse-tabs',
				contentSelector: '.verse-content',
				initial: 'description',
			},
		];
	}
}
