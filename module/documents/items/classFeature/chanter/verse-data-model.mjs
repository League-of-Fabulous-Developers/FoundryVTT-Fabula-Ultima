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
			status: game.i18n.localize(KeyDataModel.statuses[keyData.status]),
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

	static roll(model, item, isShift) {
		new VersesApplication(model).render(true);
	}

	// static async roll(model, item) {
	// 	if (!model.key || !model.tone) {
	// 		return;
	// 	}

	// 	const keys = model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof KeyDataModel) ?? [];
	// 	const tones = model.parent.parent?.actor?.itemTypes.classFeature.filter((item) => item.system.data instanceof ToneDataModel) ?? [];

	// 	const volumeSelection = await Dialog.prompt({
	// 		title: game.i18n.localize('FU.ClassFeatureVerseSingDialogTitle'),
	// 		label: game.i18n.localize('FU.ClassFeatureVerseSingDialogLabel'),
	// 		content: `
	// 			<div>
	// 				<label>${game.i18n.localize('FU.ClassFeatureVerseSelectVolume')}</label>
	// 				<select name="volume">
	// 					${Object.entries(volumes)
	// 						.map(([key, label]) => `<option value="${key}">${game.i18n.localize(label)}</option>`)
	// 						.join('')}
	// 				</select>
	// 			</div>
	// 			<div>
	// 				<label>${game.i18n.localize('FU.ClassFeatureVerseChooseKey')}</label>
	// 				<select name="key">
	// 					${keys.map((key) => `<option value="${key.id}">${key.name}</option>`).join('')}
	// 				</select>
	// 			</div>
	// 			<div>
	// 				<label>${game.i18n.localize('FU.ClassFeatureVerseSelectTone')}</label>
	// 				<select name="tone">
	// 					${tones.map((tone) => `<option value="${tone.id}">${tone.name}</option>`).join('')}
	// 				</select>
	// 			</div>
	// 		`,
	// 		options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
	// 		rejectClose: false,
	// 		callback: (html) => ({
	// 			volume: html.find('select[name=volume]').val(),
	// 			key: html.find('select[name=key]').val(),
	// 			tone: html.find('select[name=tone]').val(),
	// 		}),
	// 	});

	// 	const actor = model.parent.parent.actor;
	// 	if (!volumeSelection || !actor) {
	// 		return;
	// 	}

	// 	// Get the selected key and tone
	// 	const selectedKey = keys.find((key) => key.id === volumeSelection.key);
	// 	const selectedTone = tones.find((tone) => tone.id === volumeSelection.tone);

	// 	// Update the model's key and tone directly with FUItem instances
	// 	if (selectedKey && selectedTone) {
	// 		model.updateSource({
	// 			key: selectedKey, // Use the FUItem instance directly
	// 			tone: selectedTone, // Use the FUItem instance directly
	// 		});
	// 	}

	// 	const data = {
	// 		verse: model,
	// 		volume: volumes[volumeSelection.volume],
	// 		cost: model.config[volumeSelection.volume],
	// 		targets: volumeTargets[volumeSelection.volume],
	// 		key: model.key.name,
	// 		tone: model.tone.name,
	// 		description: await getDescription(model, true),
	// 	};

	// 	const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
	// 	const chatMessage = {
	// 		speaker,
	// 		flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
	// 		content: await renderTemplate('systems/projectfu/templates/feature/chanter/feature-verse-chat-message.hbs', data),
	// 		flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
	// 	};

	// 	ChatMessage.create(chatMessage);
	// }

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
