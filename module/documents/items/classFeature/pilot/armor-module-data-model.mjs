import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends RollableClassFeatureDataModel
 * @property {Object} defense
 * @property {"", "dex", "ins", "mig", "wlp"} defense.attribute
 * @property {number} defense.modifier
 * @property {Object} magicDefense
 * @property {"", "dex", "ins", "mig", "wlp"} magicDefense.attribute
 * @property {number} magicDefense.modifier
 * @property {boolean} martial
 * @property {string} quality
 * @property {string} description
 */
export class ArmorModuleDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { SchemaField, StringField, NumberField, BooleanField, HTMLField } = foundry.data.fields;
		return {
			defense: new SchemaField({
				attribute: new StringField({ initial: 'dex', choices: Object.keys(CONFIG.FU.attributeAbbreviations), nullable: false, blank: true }),
				modifier: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			magicDefense: new SchemaField({
				attribute: new StringField({ initial: 'ins', choices: Object.keys(CONFIG.FU.attributeAbbreviations), nullable: false, blank: true }),
				modifier: new NumberField({ initial: 0, integer: true, nullable: false }),
			}),
			martial: new BooleanField(),
			quality: new StringField(),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/pilot/armor-module-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/pilot/armor-module-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureArmorModule';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			attributes: CONFIG.FU.attributeAbbreviations,
			vehicle: model.actor?.system.vehicle.vehicle,
			active: model.item === model.actor?.system.vehicle.armor || false,
		};
	}

	/**
	 * Override defensive attributes based on the `martial` toggle.
	 */
	prepareData() {
		if (this.martial) {
			this.defense.attribute = '';
			this.magicDefense.attribute = '';
		} else {
			this.defense.attribute = this.defense.attribute || 'dex';
			this.magicDefense.attribute = this.magicDefense.attribute || 'ins';
		}
	}

	transferEffects() {
		return this.actor.system.vehicle.embarked && this.actor.system.vehicle.armor === this.item;
	}

	static async roll(model, item) {
		const actor = model.parent.parent.actor;
		if (!actor) {
			return;
		}
		const data = {
			martial: model.martial,
			mdefenseAttributeAbbreviations: FU.attributeAbbreviations[model.magicDefense.attribute],
			mdefenseAttributesMod: model.magicDefense.modifier,
			defenseAttributeAbbreviations: FU.attributeAbbreviations[model.defense.attribute],
			defenseAttributesMod: model.defense.modifier,
			quality: model.quality,
			description: await TextEditor.enrichHTML(model.description),
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/pilot/feature-armor-module-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}
}
