import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { Targeting } from '../../../../helpers/targeting.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import FUApplication from '../../../../ui/application.mjs';
import { ActionCostDataModel } from '../../common/action-cost-data-model.mjs';

/**
 * @param {VerseDataModel} model
 * @return {Promise<string|string>}
 */
async function getDescription(model) {
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

	// Set rollData based on the key
	const keyData = key.system.data;
	rollData.key = {
		type: game.i18n.localize(FU.damageTypes[keyData.type]),
		status: game.i18n.localize(FU.statusEffects[keyData.status]),
		attribute: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
		recovery: game.i18n.localize(FU.resources[keyData.recovery]),
	};

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
	 * @type KeyDataModel
	 */
	#defaultKey;

	/**
	 * @type ToneDataModel
	 */
	#defaultTone;

	constructor(verse, options = {}) {
		super(options);
		if (verse.app) {
			return verse.app;
		}

		this.#verse = verse;
		// this.#verse = verse.clone({}, { keepId: true });
		verse.app = this;

		// Set predefined key and tone if provided in options
		this.#defaultKey = options.predefinedKey ? verse.actor.items.get(options.predefinedKey) : this.keys[Object.keys(this.keys)[0]];
		this.#defaultTone = options.predefinedTone ? verse.actor.items.get(options.predefinedTone) : this.tones[Object.keys(this.tones)[0]];
	}

	/**
	 * @returns {Record<string, KeyDataModel>}
	 */
	get keys() {
		return this.#verse.actor.itemTypes.classFeature
			.filter((item) => item.system.data instanceof KeyDataModel)
			.reduce((agg, item) => {
				agg[item.id] = item;
				return agg;
			}, {});
	}

	/**
	 * @returns {Record<string, ToneDataModel>}
	 */
	get tones() {
		return this.#verse.actor.itemTypes.classFeature
			.filter((item) => item.system.data instanceof ToneDataModel)
			.reduce((agg, item) => {
				agg[item.id] = item;
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
				key: this.#defaultKey,
				tone: this.#defaultTone,
			});
		}

		// Fetch the initial description
		const effects = await getDescription(this.#verse);

		// Current key, tone, and volume selections
		let performance = {
			key: this.#verse.key?.id || '',
			tone: this.#verse.tone?.id || '',
			volume: this.#verse.volume || this.defaultVolume,
		};

		return {
			keys: this.keys, // Convert object to array for dropdown
			tones: this.tones, // Convert object to array for dropdown
			volumes,
			performance,
			effects, // Include description effects
		};
	}

	static async #onFormSubmit(event, form, formData) {
		// Process the form data
		formData = foundry.utils.expandObject(formData.object);
		const selectedKey = this.#verse.actor.items.get(formData.performance.key);
		const selectedTone = this.#verse.actor.items.get(formData.performance.tone);
		const selectedVolume = formData.performance.volume;

		// Update the verse with the selected key, tone, and volume
		await this.#verse.updateSource({
			key: selectedKey,
			tone: selectedTone,
			volume: selectedVolume,
		});
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

		// SpendResource
		const sections = [];
		const expense = new ActionCostDataModel({
			resource: 'mp',
			amount: cost,
			perTarget: false,
		});
		CommonSections.spendResource(sections, actor, item, expense, targets, flags);
		CommonEvents.skill(actor, item);

		// Data for the template
		const data = {
			verse: this.#verse,
			volume: volumes[volumeSelection],
			cost: cost,
			targets: volumeTargets[volumeSelection],
			key: this.#verse.key?.name || '',
			tone: this.#verse.tone?.name || '',
			description: await getDescription(this.#verse, true),
			sections: sections,
		};

		// Prepare the chat message data
		const chatMessage = {
			speaker: ChatMessage.implementation.getSpeaker({ actor }),
			flavor: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', this.#verse.parent.parent),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/chanter/feature-verse-chat-message.hbs', data),
			flags: flags,
		};

		// Create the chat message
		await ChatMessage.create(chatMessage);
		this.close();
	}
}
