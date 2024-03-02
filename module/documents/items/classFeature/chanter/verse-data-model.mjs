import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FUItem } from '../../item.mjs';
import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { LocallyEmbeddedDocumentField } from '../locally-embedded-document-field.mjs';
import { FUActor } from '../../../actors/actor.mjs';
import { FU } from '../../../../helpers/config.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';

const volumes = {
	low: 'FU.ClassFeatureVerseVolumeLow',
	medium: 'FU.ClassFeatureVerseVolumeMedium',
	high: 'FU.ClassFeatureVerseVolumeHigh',
};

const volumeTargets = {
	low: 'FU.ClassFeatureVerseVolumeLowTargets',
	medium: 'FU.ClassFeatureVerseVolumeMediumTargets',
	high: 'FU.ClassFeatureVerseVolumeHighTargets',
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
			status: game.i18n.localize(KeyDataModel.statuses[keyData.status]),
			attribute: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
			recovery: game.i18n.localize(KeyDataModel.recoveryOptions[keyData.recovery]),
		};

		const actor = model.parent.parent?.actor;
		if (useAttributes && actor) {
			rollData.attributes = Object.entries(actor?.system.attributes ?? {}).reduce(
				(agg, [key, value]) => ({
					...agg,
					[key]: value.current,
				}),
				{},
			);
		} else {
			rollData.attributes = (await ToneDataModel.getAdditionalData(tone.system.data)).rollData.attributes;
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

	static async roll(model) {
		if (!model.key || !model.tone) {
			return;
		}

		const volume = await Dialog.prompt({
			title: game.i18n.localize('FU.ClassFeatureVerseSingDialogTitle'),
			label: game.i18n.localize('FU.ClassFeatureVerseSingDialogLabel'),
			content: `<select name="volume">${Object.entries(volumes).map(([key, label]) => `<option value="${key}">${game.i18n.localize(label)}</option>`)}</select>`,
			rejectClose: false,
			callback: (html) => html.find('select[name=volume]').val(),
		});

		const actor = model.parent.parent.actor;
		if (!volume || !actor) {
			return;
		}
		const data = {
			verse: model,
			volume: volumes[volume],
			cost: model.config[volume],
			targets: volumeTargets[volume],
			key: model.key.name,
			tone: model.tone.name,
			description: await getDescription(model, true),
		};
		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await renderTemplate('systems/projectfu/templates/feature/chanter/feature-verse-chat-message.hbs', data),
		};

		ChatMessage.create(chatMessage);
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
