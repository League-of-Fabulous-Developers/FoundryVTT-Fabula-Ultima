import { UseWeaponDataModel } from '../common/use-weapon-data-model.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { DamageDataModel } from '../common/damage-data-model.mjs';
import { ImprovisedDamageDataModel } from '../common/improvised-damage-data-model.mjs';
import { SpellMigrations } from './spell-migrations.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { TargetingDataModel } from '../common/targeting-data-model.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { Flags } from '../../../helpers/flags.mjs';
import { ChooseWeaponDialog } from '../skill/choose-weapon-dialog.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {Object} flags
 * @param {TargetData[]} targets
 */
function onRenderCheck(data, result, actor, item, flags) {
	if (item && item.system instanceof SpellDataModel) {
		// TODO: Replace with CommonSections.tags
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-spell-details.hbs',
			data: {
				spell: {
					duration: item.system.duration.value,
					target: item.system.targeting.rule,
					max: item.system.targeting.max,
					mpCost: item.system.cost.amount,
					opportunity: item.system.opportunity,
				},
			},
		}));

		CommonSections.traits(data, item.system.traits, CHECK_DETAILS);
		CommonSections.description(data, item.system.description, item.system.summary.value, CHECK_DETAILS);

		const targets = CheckConfiguration.inspect(result).getTargetsOrDefault();

		// TODO: Find a better way to handle this, as it's needed when using a spell without accuracy
		if (!item.system.hasRoll.value) {
			CommonSections.targeted(data, actor, item, targets, flags, null, null);
		}

		CommonSections.spendResource(data, actor, item, targets, flags);
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {String} fuid
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
 * @property {Number} maxTargets.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 * @property {ItemAttributesDataModel} rollInfo.attributes
 * @property {number} rollInfo.accuracy.value
 * @property {DamageDataModel} rollInfo.damage
 * @property {boolean} hasRoll.value
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 */
export class SpellDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, SetField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new EmbeddedDataField(UseWeaponDataModel, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(DamageDataModel, {}),
			impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			duration: new SchemaField({ value: new StringField() }),
			isOffensive: new SchemaField({ value: new BooleanField() }),
			opportunity: new StringField(),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
				attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
				accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
				damage: new EmbeddedDataField(DamageDataModel, {}),
			}),
			hasRoll: new SchemaField({ value: new BooleanField() }),
			cost: new EmbeddedDataField(ActionCostDataModel, {}),
			targeting: new EmbeddedDataField(TargetingDataModel, {}),
			traits: new SetField(new StringField()),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source) ?? source;
		SpellMigrations.run(source);
		return source;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.hasRoll.value) {
			return Checks.magicCheck(this.parent.actor, this.parent, this.#initializeMagicCheck(modifiers));
		} else {
			CommonEvents.spell(this.parent.actor, this.parent);
			return Checks.display(this.parent.actor, this.parent);
		}
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 */
	#initializeMagicCheck(modifiers) {
		return async (check, actor, item) => {
			const configure = CheckConfiguration.configure(check);
			configure.setHrZero(modifiers.shift);

			let attributeOverride = false;
			if (actor.getFlag(Flags.Scope, Flags.Toggle.WeaponMagicCheck)) {
				const weapon = await ChooseWeaponDialog.prompt(actor, true);
				if (weapon) {
					check.primary = weapon.system.attributes.primary.value;
					check.secondary = weapon.system.attributes.secondary.value;
					attributeOverride = true;
					configure.addWeaponAccuracy(weapon.system);
				}
			}

			if (!attributeOverride) {
				check.primary = item.system.rollInfo.attributes.primary.value;
				check.secondary = item.system.rollInfo.attributes.secondary.value;
			}

			check.modifiers.push({
				label: 'FU.MagicCheckBaseAccuracy',
				value: item.system.rollInfo.accuracy.value,
			});

			check.additionalData.hasDamage = item.system.rollInfo.damage.hasDamage.value;

			// Add typical bonuses
			configure
				.setDamage(item.system.rollInfo.damage.type.value, item.system.rollInfo.damage.value)
				.addTraits(item.system.rollInfo.damage.type.value, 'spell')
				.addTraitsFromItemModel(item.system.traits)
				.setTargetedDefense('mdef')
				.setDamageOverride(actor, 'spell')
				.addDamageBonusIfDefined('FU.DamageBonusTypeSpell', actor.system.bonuses.damage.spell)
				.modifyHrZero((hrZero) => hrZero || item.system.rollInfo.useWeapon.hrZero.value);
		};
	}

	get attributePartials() {
		return [
			ItemPartialTemplates.controls,
			ItemPartialTemplates.classField,
			ItemPartialTemplates.opportunityField,
			ItemPartialTemplates.durationField,
			ItemPartialTemplates.actionCost,
			ItemPartialTemplates.targeting,
			ItemPartialTemplates.legacyAccuracy,
			ItemPartialTemplates.legacyDamage,
			ItemPartialTemplates.behaviorField,
		];
	}
}
