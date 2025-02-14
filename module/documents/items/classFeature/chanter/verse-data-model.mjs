import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FUItem } from '../../item.mjs';
import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { LocallyEmbeddedDocumentField } from '../locally-embedded-document-field.mjs';
import { FUActor } from '../../../actors/actor.mjs';
import { FU } from '../../../../helpers/config.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { VersesApplication } from './verses-application.mjs';

const volumes = {
	low: 'FU.ClassFeatureVerseVolumeLow',
	medium: 'FU.ClassFeatureVerseVolumeMedium',
	high: 'FU.ClassFeatureVerseVolumeHigh',
};

async function getDescription(model, useAttributes = false) {
	const key = model.key;
	const tone = model.tone;

	if (!tone) {
		return '';
	}
	let rollData;
	if (!key) {
		rollData = (await ToneDataModel.getAdditionalData(tone.data.system)).rollData;
	} else {
		rollData = {};
		const keyData = key.system.data;
		rollData.key = {
			type: game.i18n.localize(FU.damageTypes[keyData.type]),
			status: `@EFFECT[${keyData.status}]`,
			//status: game.i18n.localize(KeyDataModel.statuses[keyData.status]),
			attribute: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
			recovery: game.i18n.localize(KeyDataModel.recoveryOptions[keyData.recovery]),
		};

		const actor = model.parent.parent?.actor;
		if (useAttributes && actor) {
			rollData.attribute = Object.entries(actor?.system.attributes ?? {}).reduce(
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

	return TextEditor.enrichHTML(tone?.system.data.description, {
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
			key: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof KeyDataModel,
			}),
			tone: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof ToneDataModel,
			}),
			config: new SchemaField({
				low: new NumberField({ initial: 10, min: 0 }),
				medium: new NumberField({ initial: 20, min: 0 }),
				high: new NumberField({ initial: 30, min: 0 }),
			}),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureVerse';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-verse-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/chanter/feature-verse-preview.hbs';
	}

	static async getAdditionalData(model) {
		return {
			volumes: volumes,
			keys: model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof KeyDataModel) ?? [],
			tones: model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof ToneDataModel) ?? [],
			description: await getDescription(model),
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
