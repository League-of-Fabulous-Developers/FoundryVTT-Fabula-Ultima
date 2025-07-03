import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';

const recoveryOptions = {
	hp: 'FU.HealthPoints',
	mp: 'FU.MindPoints',
};

const statuses = {
	slow: 'FU.Slow',
	dazed: 'FU.Dazed',
	weak: 'FU.Weak',
	shaken: 'FU.Shaken',
	enraged: 'FU.Enraged',
	poisoned: 'FU.Poisoned',
};

/**
 * @extends RollableClassFeatureDataModel
 * @property {DamageType} type
 * @property {"slow","dazed","weak","shaken","enraged","poisoned"} status
 * @property {Attribute} attribute
 * @property {"hp","mp"} recovery
 */
export class KeyDataModel extends RollableClassFeatureDataModel {
	static get recoveryOptions() {
		return recoveryOptions;
	}

	static get statuses() {
		return statuses;
	}

	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			type: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes) }),
			status: new StringField({ initial: 'slow', choices: Object.keys(statuses) }),
			attribute: new StringField({ initial: 'dex', choices: Object.keys(FU.attributeAbbreviations) }),
			recovery: new StringField({ initial: 'hp', choices: Object.keys(recoveryOptions) }),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureKey';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/chanter/feature-key-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/chanter/feature-key-preview.hbs';
	}

	static getAdditionalData() {
		return {
			types: FU.damageTypes,
			statuses: KeyDataModel.statuses,
			attributes: FU.attributes,
			attributeAbbreviations: FU.attributeAbbreviations,
			recoveryOptions: KeyDataModel.recoveryOptions,
		};
	}

	static async roll(model, item) {
		const actor = model.parent.parent.actor;
		if (!actor) {
			return;
		}

		const data = {
			types: FU.damageTypes[model.type],
			statuses: KeyDataModel.statuses[model.status],
			attributes: FU.attributes[model.attribute],
			attributeAbbreviations: FU.attributeAbbreviations[model.attribute],
			recoveryOptions: KeyDataModel.recoveryOptions[model.recovery],
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/chanter/feature-key-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}
}
