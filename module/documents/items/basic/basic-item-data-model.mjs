import { FU } from '../../../helpers/config.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { TraitUtils } from '../../../pipelines/traits.mjs';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'accuracy' && item.system instanceof BasicItemDataModel) {
		check.primary = item.system.attributes.primary.value;
		check.secondary = item.system.attributes.secondary.value;
		check.modifiers.push({
			label: 'FU.AccuracyCheckBaseAccuracy',
			value: item.system.accuracy.value,
		});
		const attack = item.system;
		const config = CheckConfiguration.configure(check);
		if (attack.hasDamage) {
			config
				.setDamage(attack.damageType.value, attack.damage.value)
				.modifyHrZero((hrZero) => hrZero || attack.rollInfo.useWeapon.hrZero.value)
				.setDamageOverride(actor, 'attack');
		}
		config
			.setTargetedDefense(attack.defense)
			.addTraits('attack')
			.setWeaponTraits({
				weaponType: attack.type.value,
			})
			.addTraitsFromItemModel(attack.traits);
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
	if (item && item.system instanceof BasicItemDataModel) {
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-basic-attack-details.hbs',
			data: {
				basic: {
					type: item.system.type.value,
					quality: item.system.quality.value,
				},
			},
		}));
		CommonSections.tags(data, item.system.getTags(), CHECK_DETAILS);
		CommonSections.description(data, item.system.description, item.system.summary.value, CHECK_DETAILS);
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {Defense} defense
 * @property {number} damage.value
 * @property {boolean} hasDamage
 * @property {WeaponType} type.value
 * @property {DamageType} damageType.value
 * @property {number} cost.value
 * @property {string} quality.value
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 */
export class BasicItemDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses) }),
			damage: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			hasDamage: new BooleanField({ initial: true, nullable: false }),
			type: new SchemaField({ value: new StringField({ initial: 'melee', choices: Object.keys(FU.weaponTypes) }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes) }) }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			quality: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			traits: new SetField(new StringField()),
		});
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return Checks.accuracyCheck(this.parent.actor, this.parent, this.#initializeAttackCheck(modifiers));
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 */
	#initializeAttackCheck(modifiers) {
		return async (check, actor, item) => {
			const configure = CheckConfiguration.configure(check);
			configure.setHrZero(modifiers.shift);
		};
	}

	/**
	 * @override
	 */
	get attributePartials() {
		return [ItemPartialTemplates.standard, ItemPartialTemplates.traitsLegacy, ItemPartialTemplates.attackAccuracy, ItemPartialTemplates.attackDamage, ItemPartialTemplates.attackTypeAndQuality];
	}

	/**
	 * @return {Tag[]}
	 */
	getTags() {
		return [...TraitUtils.toTags(this.traits)];
	}
}
