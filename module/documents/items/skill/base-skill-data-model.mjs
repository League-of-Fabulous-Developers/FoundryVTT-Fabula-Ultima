import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { UseWeaponDataModelV2 } from '../common/use-weapon-data-model-v2.mjs';
import { FU } from '../../../helpers/config.mjs';
import { DamageDataModelV2 } from '../common/damage-data-model-v2.mjs';
import { ItemAttributesDataModelV2 } from '../common/item-attributes-data-model-v2.mjs';
import { TargetingDataModel } from '../common/targeting-data-model.mjs';
import { ActionCostDataModel } from '../common/action-cost-data-model.mjs';
import { EffectApplicationDataModel } from '../common/effect-application-data-model.mjs';
import { ResourceDataModel } from '../common/resource-data-model.mjs';
import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { DamageTraits, TraitUtils } from '../../../pipelines/traits.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { SkillMigrations } from './skill-migrations.mjs';
import { SkillLikeItemHelper } from '../skill-like-item-helper.mjs';

/**
 * @property {string} description
 * @property {string} opportunity
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} accuracy
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {EffectApplicationDataModel} effects
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 * @property {Boolean} hasRoll.value
 */
export class BaseSkillDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, BooleanField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			attributes: new EmbeddedDataField(ItemAttributesDataModelV2, {
				initial: {
					primary: 'dex',
					secondary: 'ins',
				},
			}),
			useWeapon: new EmbeddedDataField(UseWeaponDataModelV2, {}),
			accuracy: new StringField({ nullable: false }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses), blank: true }),
			damage: new EmbeddedDataField(DamageDataModelV2, {}),
			targeting: new EmbeddedDataField(TargetingDataModel, {}),
			traits: new SetField(new StringField()),
			effects: new EmbeddedDataField(EffectApplicationDataModel, {}),
			cost: new EmbeddedDataField(ActionCostDataModel, {}),
			resource: new EmbeddedDataField(ResourceDataModel, {}),
			// TODO: Deprecate due to progress tracks in effects
			hasRoll: new SchemaField({ value: new BooleanField() }),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			hasResource: new SchemaField({ value: new BooleanField() }),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source);
		SkillMigrations.run(source);
		return source;
	}

	prepareBaseData() {
		if (!this.hasRoll.value) {
			this.useWeapon.accuracy = false;
		}
		if (!this.damage.hasDamage) {
			this.useWeapon.damage = false;
		}
		// If not using weapon damage, and it's not set, reset to default
		if (!this.useWeapon.damage && !this.damage.type) {
			this.damage.type = 'physical';
		}
	}

	/**
	 * @return Tag[]
	 */
	getTags() {
		return [];
	}

	/**
	 * @returns {boolean} Whether this is a passive skill.
	 * @remarks This is used to determine whether to show this skill in some UIs.
	 */
	get passive() {
		let active = this.hasRoll.value || this.useWeapon.accuracy || this.damage.hasDamage || this.effects.entries.length > 0;
		/** @type {FUItem} **/
		const item = this.parent;
		for (const effect of item.effects) {
			const rollRule = effect.findRuleElement((rule) => {
				return rule.trigger.type === 'itemRollRuleTrigger';
			});
			if (rollRule !== undefined) {
				active = true;
			}
		}
		return !active;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return SkillLikeItemHelper.roll(this.parent, modifiers);
	}

	/**
	 * @returns {{label: *, value: *}[]}
	 * @remarks Used by templates.
	 */
	get traitOptions() {
		return TraitUtils.getOptions(DamageTraits);
	}

	/**
	 * @returns {String[]} Common partials used by all skills.
	 */
	get commonPartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.traitsLegacy,
			ItemPartialTemplates.actionCost,
			ItemPartialTemplates.accuracy,
			ItemPartialTemplates.damage,
			ItemPartialTemplates.effects,
			ItemPartialTemplates.resource,
			ItemPartialTemplates.resourcePoints,
			ItemPartialTemplates.targeting,
		];
	}
}

SkillLikeItemHelper.registerSkillLikeType(BaseSkillDataModel);
