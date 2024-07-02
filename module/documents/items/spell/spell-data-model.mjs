import { UseWeaponDataModel } from '../common/use-weapon-data-model.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { DamageDataModel } from '../common/damage-data-model.mjs';
import { ImprovisedDamageDataModel } from '../common/improvised-damage-data-model.mjs';
import { SpellMigrations } from './spell-migrations.mjs';
import { MagicCheck } from '../../../checks/magic-check.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { SYSTEM } from '../../../helpers/config.mjs';
import { SETTINGS } from '../../../settings.js';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';

/**
 * @param {Check} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'magic' && item.system instanceof SpellDataModel) {
		check.primary = item.system.rollInfo.attributes.primary.value;
		check.secondary = item.system.rollInfo.attributes.secondary.value;
		check.modifiers.push({
			label: 'FU.MagicCheckBaseAccuracy',
			value: item.system.accuracy.value,
		});
		const configurer = MagicCheck.configure(check)
			.setDamage(item.system.rollInfo.damage.type.value, item.system.rollInfo.damage.value)
			.setTargetedDefense('mdef')
			.modifyHrZero((hrZero) => hrZero || item.system.rollInfo.useWeapon.hrZero.value);

		const spellBonus = actor.system.bonuses.damage.spell;
		if (spellBonus) {
			configurer.addDamageBonus('FU.DamageBonusTypeSpell', spellBonus);
		}
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
function onRenderCheck(data, result, actor, item) {
	if (item && item.system instanceof SpellDataModel) {
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-spell-details.hbs',
			data: {
				spell: {
					duration: item.system.duration.value,
					target: item.system.target.value,
					mpCost: item.system.mpCost.value,
					opportunity: item.system.opportunity,
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
				collapseDescriptions: game.settings.get(SYSTEM, SETTINGS.collapseDescriptions),
			},
		}));
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {string} class.value
 * @property {UseWeaponDataModel} useWeapon
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {DamageDataModel} damage
 * @property {ImprovisedDamageDataModel} impdamage
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {string} mpCost.value
 * @property {string} target.value
 * @property {string} duration.value
 * @property {boolean} isOffensive.value
 * @property {string} opportunity
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 * @property {ItemAttributesDataModel} rollInfo.attributes
 * @property {number} rollInfo.accuracy.value
 * @property {DamageDataModel} rollInfo.damage
 * @property {boolean} hasRoll.value
 */
export class SpellDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new EmbeddedDataField(UseWeaponDataModel, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(DamageDataModel, {}),
			impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			mpCost: new SchemaField({ value: new StringField() }),
			target: new SchemaField({ value: new StringField() }),
			duration: new SchemaField({ value: new StringField() }),
			isOffensive: new SchemaField({ value: new BooleanField() }),
			opportunity: new StringField(),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
				attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
				accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
				damage: new EmbeddedDataField(DamageDataModel, {}),
			}),
			hasRoll: new SchemaField({ value: new BooleanField() }),
		};
	}

	static migrateData(source) {
		SpellMigrations.run(source);
		return source;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.hasRoll.value) {
			return ChecksV2.magicCheck(this.parent.actor, this.parent, CheckConfiguration.initHrZero(modifiers.shift));
		} else {
			return ChecksV2.display(this.parent.actor, this.parent);
		}
	}
}
