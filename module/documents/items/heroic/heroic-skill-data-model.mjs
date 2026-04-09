import { FU } from '../../../helpers/config.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { BaseSkillDataModel } from '../skill/base-skill-data-model.mjs';
import { DamageTraits, HeroicSkillTraits, TraitUtils } from '../../../pipelines/traits.mjs';

/**
 * @property {string} subtype.value
 * @property {string} class.value
 * @property {string} requirement.value
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
 */
export class HeroicSkillDataModel extends BaseSkillDataModel {
	static defineSchema() {
		const { SchemaField, StringField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			subtype: new SchemaField({ value: new StringField() }),
			class: new SchemaField({ value: new StringField() }),
			requirement: new SchemaField({ value: new StringField() }),
		});
	}

	get attributePartials() {
		return [...this.commonPartials, ItemPartialTemplates.classField, ItemPartialTemplates.heroicSkill];
	}

	get traitOptions() {
		return TraitUtils.getOptions({
			...DamageTraits,
			...HeroicSkillTraits,
		});
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	updateHeroicResource(event, target) {
		return this.parent.update({
			'system.rp': this.rp.getProgressUpdate(event, target, { indirect: { dataAttribute: 'data-resource-action', attributeValueIncrement: 'increment', attributeValueDecrement: 'decrement' } }),
		});
	}

	/**
	 * @override
	 */
	getTags() {
		return [{ tag: 'FU.Class', separator: ':', value: this.class.value, show: this.class.value }, { tag: FU.heroicType[this.subtype.value] }];
	}
}
