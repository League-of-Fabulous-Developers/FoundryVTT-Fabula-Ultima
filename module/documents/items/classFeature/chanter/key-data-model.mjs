import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { FU, SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { KeyMigrations } from './key-migrations.mjs';
import FoundryUtils from '../../../../helpers/foundry-utils.mjs';

const resourceOptions = {
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
 * @property {"hp","mp"} resource
 */
export class KeyDataModel extends RollableClassFeatureDataModel {
	static get resourceOptions() {
		return resourceOptions;
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
			resource: new StringField({ initial: 'hp', choices: Object.keys(resourceOptions) }),
		};
	}

	static migrateData(source) {
		source = super.migrateData(source);
		KeyMigrations.run(source);
		return source;
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
			resourceOptions: KeyDataModel.resourceOptions,
		};
	}

	/**
	 * @param keyData
	 * @remarks We keep distinct raw and localized versions of the keys because data entries by both our compendiums and users want to use either.
	 */
	static getRollData(keyData) {
		return {
			type: keyData.type,
			typeLocal: game.i18n.localize(FU.damageTypes[keyData.type]),
			status: keyData.status,
			statusLocal: game.i18n.localize(FU.statusEffects[keyData.status]),
			attribute: keyData.attribute,
			attributeLocal: game.i18n.localize(FU.attributeAbbreviations[keyData.attribute]),
			resource: keyData.resource,
			resourceLocal: game.i18n.localize(FU.resources[keyData.resource]),
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
			resourceOptions: KeyDataModel.resourceOptions[model.resource],
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await FoundryUtils.renderTemplate('chat-check-flavor-item-v2', {
				item: model.parent.parent,
			}),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/chanter/feature-key-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item.uuid } },
		};

		ChatMessage.create(chatMessage);
	}
}
