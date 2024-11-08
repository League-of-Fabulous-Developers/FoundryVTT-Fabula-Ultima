import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
async function getDescription(model, useAttributes = false) {
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
	if (content.trim()) {
		return content.trim();
	}

	let rollData = {};

	// If key is not available, default to tone's rollData
	if (!key) {
		rollData = (await ToneDataModel.getAdditionalData(tone.data.system)).rollData;
	} else {
		// Set rollData based on the key
		const keyData = key.system.data;
		rollData.key = {
			type: game.i18n.localize(FU.damageTypes[keyData.type]),
			status: game.i18n.localize(KeyDataModel.statuses[keyData.status]),
			attribute: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
			recovery: game.i18n.localize(KeyDataModel.recoveryOptions[keyData.recovery]),
		};

		const actor = model.parent?.parent?.actor;
		if (useAttributes && actor) {
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
	}

	// Return enriched HTML using the tone description and roll data
	return TextEditor.enrichHTML(tone.system.data.description || '', {
		rollData: rollData,
	});
}

export class VersesApplication extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['form', 'projectfu', 'verses-app'],
			width: 550,
			height: 'auto',
			closeOnSubmit: false,
			editable: true,
			sheetConfig: false,
			submitOnChange: true,
			submitOnClose: true,
			minimizable: false,
			title: game.i18n.localize('FU.ClassFeatureVerseSingDialogTitle'),
		});
	}

	/**
	 * @type VerseDataModel
	 */
	#verse;

	constructor(verse, options = {}) {
		super(verse);
		if (verse.app) {
			return verse.app;
		}

		this.#verse = verse;
		verse.app = this;

		// Set predefined key and tone if provided in options
		if (options.predefinedKey) {
			this.#verse.key = verse.actor.items.get(options.predefinedKey);
		}
		if (options.predefinedTone) {
			this.#verse.tone = verse.actor.items.get(options.predefinedTone);
		}
	}

	get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-verse-application.hbs';
	}

	async getData(options = {}) {
		// Prepare data for the form template
		let keys = this.#verse.actor.itemTypes.classFeature
			.filter((item) => item.system.data instanceof KeyDataModel)
			.reduce((agg, item) => {
				agg[item.id] = item;
				return agg;
			}, {});

		let tones = this.#verse.actor.itemTypes.classFeature
			.filter((item) => item.system.data instanceof ToneDataModel)
			.reduce((agg, item) => {
				agg[item.id] = item;
				return agg;
			}, {});

		// Define volume options
		const volume = [
			{ id: 'low', name: game.i18n.localize('FU.ClassFeatureVerseVolumeLow') },
			{ id: 'medium', name: game.i18n.localize('FU.ClassFeatureVerseVolumeMedium') },
			{ id: 'high', name: game.i18n.localize('FU.ClassFeatureVerseVolumeHigh') },
		];

		// Fetch the initial description
		const effects = await getDescription(this.#verse, true);

		// Current key, tone, and volume selections
		let performance = {
			key: this.#verse.key?.id || '',
			tone: this.#verse.tone?.id || '',
			volume: this.#verse.volume || 'low',
		};

		return {
			keys: Object.values(keys), // Convert object to array for dropdown
			tones: Object.values(tones), // Convert object to array for dropdown
			volume,
			performance,
			effects, // Include description effects
		};
	}

	async _updateObject(event, formData) {
		// Process the form data
		formData = foundry.utils.expandObject(formData);
		const selectedKey = this.#verse.actor.items.get(formData.performance.key);
		const selectedTone = this.#verse.actor.items.get(formData.performance.tone);
		const selectedVolume = formData.performance.volume;

		// Update the verse with the selected key, tone, and volume
		await this.#verse.updateSource({
			key: selectedKey,
			tone: selectedTone,
			volume: selectedVolume,
		});
	}

	async close(options = {}) {
		await super.close(options);
		delete this.#verse.app;

		if (options.getPerforming) {
			await this.#startPerforming();
		}
	}

	async #startPerforming() {
		if (!this.#verse.key || !this.#verse.tone) {
			// Show a warning notification if either key or tone is missing
			ui.notifications.warn(game.i18n.localize('FU.ClassFeatureVerseNoKeyOrToneSelected'));
			return;
		}

		const volumeSelection = this.#verse.volume || 'medium';

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
		const data = {
			verse: this.#verse,
			volume: volumes[volumeSelection],
			cost: this.#verse.config[volumeSelection],
			targets: volumeTargets[volumeSelection],
			key: this.#verse.key?.name || '',
			tone: this.#verse.tone?.name || '',
			description: await getDescription(this.#verse, true),
		};

		const actor = this.#verse.actor;

		// Prepare the chat message data
		const chatMessage = {
			speaker: ChatMessage.implementation.getSpeaker({ actor }),
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', this.#verse.parent.parent),
			content: await renderTemplate('systems/projectfu/templates/feature/chanter/feature-verse-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: this.#verse } },
		};

		// Create the chat message
		await ChatMessage.create(chatMessage);
	}

	activateListeners(html) {
		super.activateListeners(html);

		const updateDescription = async () => {
			// Ensure that the #verse object is updated with the selected key and tone
			await this.#verse.updateSource({
				key: this.#verse.key,
				tone: this.#verse.tone,
			});

			const effects = await getDescription(this.#verse, true);
			html.find('div.verse-description').html(effects);
		};

		html.find('select[name="performance.tone"]').change(async (event) => {
			const selectedToneId = $(event.target).val();
			this.#verse.tone = this.#verse.actor.items.get(selectedToneId);

			// Update the description after setting the tone
			if (this.#verse.tone) {
				await updateDescription();
			}
		});

		html.find('select[name="performance.key"]').change(async (event) => {
			const selectedKeyId = $(event.target).val();
			this.#verse.key = this.#verse.actor.items.get(selectedKeyId);

			// Update the description after setting the key
			if (this.#verse.key) {
				await updateDescription();
			}
		});

		html.find('select[name="performance.volume"]').change(async (event) => {
			const selectedVolumeId = $(event.target).val();
			this.#verse.volume = selectedVolumeId;

			await updateDescription();
		});

		html.find('[data-action=startPerforming]').click(() => this.close({ getPerforming: true }));

		updateDescription();
	}
}
