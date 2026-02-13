import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { Targeting } from '../../../../helpers/targeting.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import FUApplication from '../../../../ui/application.mjs';
import { ActionCostDataModel } from '../../common/action-cost-data-model.mjs';
import { ClassFeatureTypeDataModel } from '../class-feature-type-data-model.mjs';
import { FUChatBuilder } from '../../../../helpers/chat-builder.mjs';

/**
 * @param {VerseDataModel} model
 * @return {Promise<string|string>}
 */
async function enrichDescription(model) {
	const key = model.key;
	const tone = model.tone;

	let content = '';

	if (!key) {
		content += `<div>${game.i18n.localize('FU.ClassFeatureVerseNoKeySelected')}</div>`;
	}

	if (!tone) {
		content += `<div>${game.i18n.localize('FU.ClassFeatureVerseNoToneSelected')}</div>`;
	}

	// If there are any error messages, return them
	if (content) {
		return content.trim();
	}

	let rollData = {};

	const keyData = key.system.data;
	rollData.key = KeyDataModel.getRollData(keyData);

	const actor = model.parent?.parent?.actor;
	if (actor) {
		rollData.attribute = Object.entries(actor.system.attributes ?? {}).reduce(
			(agg, [attrKey, value]) => ({
				...agg,
				[attrKey]: value.current,
			}),
			{},
		);
	} else {
		rollData.attribute = (await ToneDataModel.getAdditionalData(tone.system.data)).rollData.attribute;
	}

	// Return enriched HTML using the tone description and roll data
	return TextEditor.enrichHTML(tone.system.data.description || '', {
		rollData: rollData,
	});
}

export class VersesApplication extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		window: { title: 'FU.ClassFeatureVerseSingDialogTitle', minimizable: false },
		classes: ['form', 'projectfu', 'verses-app'],
		position: {
			width: 550,
			height: 'auto',
		},
		form: {
			closeOnSubmit: false,
			submitOnChange: true,
			handler: VersesApplication.#onFormSubmit,
		},
		actions: {
			perform: VersesApplication.#startPerforming,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/feature/chanter/feature-verse-application.hbs',
		},
	};

	/**
	 * @type VerseDataModel
	 */
	#verse;

	/**
	 * @type {FUItem|PseudoItem}
	 */
	#defaultKey;

	/**
	 * @type {FUItem|PseudoItem}
	 */
	#defaultTone;

	constructor(verse, options = {}) {
		super(options);
		if (verse.app) {
			return verse.app;
		}

		this.#verse = verse;
		verse.app = this;
		verse.volume = this.defaultVolume;

		// Set predefined key and tone if provided in options
		const keys = this.keys;
		this.#defaultKey = Object.values(keys)[0];
		if (options.predefinedKey) {
			const predefinedKey = options.predefinedKey;
			if (this.isKeyItem(predefinedKey)) {
				this.#defaultKey = predefinedKey;
			}
			if (typeof predefinedKey === 'string') {
				if (predefinedKey.includes('.')) {
					const maybeKey = foundry.utils.fromUuidSync(predefinedKey, { relative: verse.actor });
					if (this.isKeyItem(maybeKey)) {
						this.#defaultKey = maybeKey;
					}
				} else {
					const maybeKey = Object.values(keys).find((value) => value.id === predefinedKey);
					if (this.isKeyItem(maybeKey)) {
						this.#defaultKey = maybeKey;
					}
				}
			}
		}

		const tones = this.tones;
		this.#defaultTone = Object.values(tones)[0];
		if (options.predefinedTone) {
			const predefinedTone = options.predefinedTone;
			if (this.isToneItem(predefinedTone)) {
				this.#defaultKey = predefinedTone;
			}
			if (typeof predefinedTone === 'string') {
				if (predefinedTone.includes('.')) {
					const maybeTone = foundry.utils.fromUuidSync(predefinedTone, { relative: verse.actor });
					if (this.isToneItem(maybeTone)) {
						this.#defaultKey = maybeTone;
					}
				} else {
					const maybeKey = Object.values(tones).find((value) => value.id === predefinedTone);
					if (this.isToneItem(maybeKey)) {
						this.#defaultKey = maybeKey;
					}
				}
			}
		}
	}

	isKeyItem(maybeKey) {
		return maybeKey?.system instanceof ClassFeatureTypeDataModel && maybeKey.system?.data instanceof KeyDataModel;
	}

	isToneItem(maybeTone) {
		return maybeTone?.system instanceof ClassFeatureTypeDataModel && maybeTone.system?.data instanceof ToneDataModel;
	}

	/**
	 * @returns {Record<string, FUItem|PseudoItem>}
	 */
	get keys() {
		return this.#verse.actor.itemTypes.classFeature
			.filter((item) => this.isKeyItem(item))
			.reduce((agg, item) => {
				agg[item.uuid] = item;
				return agg;
			}, {});
	}

	/**
	 * @returns {Record<string, FUItem|PseudoItem>}
	 */
	get tones() {
		return this.#verse.actor.itemTypes.classFeature
			.filter((item) => this.isToneItem(item))
			.reduce((agg, item) => {
				agg[item.uuid] = item;
				return agg;
			}, {});
	}

	get defaultVolume() {
		return 'low';
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, await this.getData());
		return context;
	}

	async getData() {
		// Define volume options
		const volumes = {
			low: game.i18n.localize('FU.ClassFeatureVerseVolumeLow'),
			medium: game.i18n.localize('FU.ClassFeatureVerseVolumeMedium'),
			high: game.i18n.localize('FU.ClassFeatureVerseVolumeHigh'),
		};

		// Set defaults if missing
		if (this.#verse.key == null || this.#verse.tone == null) {
			await this.#verse.updateSource({
				key: this.#defaultKey?.uuid,
				tone: this.#defaultTone?.uuid,
			});
		}

		// Fetch the initial description
		const effects = await enrichDescription(this.#verse);

		// Current key, tone, and volume selections
		let performance = {
			key: this.#verse.key?.uuid || '',
			tone: this.#verse.tone?.uuid || '',
			volume: this.#verse.volume || this.defaultVolume,
		};

		return {
			keys: this.keys,
			tones: this.tones,
			volumes,
			performance,
			effects, // Include description effects
		};
	}

	static async #onFormSubmit(event, form, formData) {
		// Process the form data
		formData = foundry.utils.expandObject(formData.object);
		const selectedKey = foundry.utils.fromUuidSync(formData.performance.key, { relative: this.#verse.actor });
		const selectedTone = foundry.utils.fromUuidSync(formData.performance.tone, { relative: this.#verse.actor });
		const selectedVolume = formData.performance.volume;

		// Update the verse with the selected key, tone, and volume
		await this.#verse.updateSource({
			key: selectedKey?.uuid,
			tone: selectedTone?.uuid,
		});
		this.#verse.volume = selectedVolume;

		this.render();
	}

	async close(options = {}) {
		await super.close(options);
		delete this.#verse.app;
	}

	static async #startPerforming() {
		if (!this.#verse.key || !this.#verse.tone) {
			// Show a warning notification if either key or tone is missing
			ui.notifications.warn(game.i18n.localize('FU.ClassFeatureVerseNoKeyOrToneSelected'));
			return;
		}

		const volumeSelection = this.#verse.volume || this.defaultVolume;

		const volumes = {
			low: game.i18n.localize('FU.ClassFeatureVerseVolumeLow'),
			medium: game.i18n.localize('FU.ClassFeatureVerseVolumeMedium'),
			high: game.i18n.localize('FU.ClassFeatureVerseVolumeHigh'),
		};

		const volumeTargets = {
			low: game.i18n.localize('FU.ClassFeatureVerseVolumeLowTargets'),
			medium: game.i18n.localize('FU.ClassFeatureVerseVolumeMediumTargets'),
			high: game.i18n.localize('FU.ClassFeatureVerseVolumeHighTargets'),
		};

		// Prepare the data object for the chat message
		let flags = { [SYSTEM]: { [Flags.ChatMessage.Item]: this.#verse } };
		const cost = this.#verse.config[volumeSelection];
		const actor = this.#verse.actor;
		const item = this.#verse.item;
		const targets = Targeting.getSerializedTargetData();
		const expense = new ActionCostDataModel({
			resource: 'mp',
			amount: cost,
			perTarget: false,
		});

		// Data for the template
		const enriched = await enrichDescription(this.#verse);
		const data = {
			verse: this.#verse,
			volume: volumes[volumeSelection],
			cost: cost,
			targets: volumeTargets[volumeSelection],
			key: this.#verse.key?.name || '',
			tone: this.#verse.tone?.name || '',
			description: enriched,
		};
		/** @type Tag[] **/
		const tags = [
			{
				tag: data.volume,
			},
			{
				tag: data.key,
			},
			{
				tag: data.tone,
			},
			{
				tag: data.targets,
			},
		];

		/** @type FUChatData **/
		const renderData = {
			sections: [],
			postRenderActions: [],
		};

		CommonSections.itemFlavor(renderData.sections, this.#verse.parent.parent);
		CommonSections.tags(renderData.sections, tags);
		CommonSections.genericText(renderData.sections, enriched);
		CommonSections.spendResource(renderData, actor, item, expense, targets, flags);

		const builder = new FUChatBuilder(actor, item);
		builder.withFlags(flags);
		builder.withRenderData(renderData);
		await builder.create();

		CommonEvents.skill(actor, item);
		this.close();
	}
}
