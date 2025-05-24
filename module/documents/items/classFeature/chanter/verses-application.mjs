import { KeyDataModel } from './key-data-model.mjs';
import { ToneDataModel } from './tone-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { Targeting } from '../../../../helpers/targeting.mjs';
import { CommonEvents } from '../../../../checks/common-events.mjs';

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
	if (content) {
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
			type: keyData.type,
			typeLocal: game.i18n.localize(FU.damageTypes[keyData.type]),
			status: keyData.status,
			statusLocal: game.i18n.localize(FU.statusEffects[keyData.status]),
			attribute: keyData.attribute,
			attributeLocal: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
			resource: keyData.recovery,
			resourceLocal: game.i18n.localize(FU.resources[keyData.recovery]),
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

	/**
	 * @type KeyDataModel
	 */
	#defaultKey;

	/**
	 * @type ToneDataModel
	 */
	#defaultTone;

	constructor(verse, options = {}) {
		super(verse);
		if (verse.app) {
			return verse.app;
		}

		this.#verse = verse;
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

	get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-verse-application.hbs';
	}

	get defaultVolume() {
		return 'low';
	}

	async getData(options = {}) {
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
		const effects = await getDescription(this.#verse, true);

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
		const expense = {
			resource: 'mp',
			amount: cost,
		};
		CommonSections.spendResource(sections, actor, item, targets, flags, expense);
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
			flavor: await renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', this.#verse.parent.parent),
			content: await renderTemplate('systems/projectfu/templates/feature/chanter/feature-verse-chat-message.hbs', data),
			flags: flags,
		};

		// Create the chat message
		await ChatMessage.create(chatMessage);
	}

	activateListeners(html) {
		super.activateListeners(html);

		const updateDescription = async (key = this.#verse.key, tone = this.#verse.tone) => {
			// Ensure that the #verse object is updated with the selected key and tone
			await this.#verse.updateSource({
				key: key,
				tone: tone,
			});

			const effects = await getDescription(this.#verse, true);
			html.find('div.verse-description').html(effects);
		};

		html.find('select[name="performance.tone"]').change(async (event) => {
			const selectedToneId = $(event.target).val();

			// Update the description after setting the tone
			if (this.#verse.tone) {
				await updateDescription(undefined, this.#verse.actor.items.get(selectedToneId));
			}
		});

		html.find('select[name="performance.key"]').change(async (event) => {
			const selectedKeyId = $(event.target).val();

			// Update the description after setting the key
			if (this.#verse.key) {
				await updateDescription(this.#verse.actor.items.get(selectedKeyId));
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
