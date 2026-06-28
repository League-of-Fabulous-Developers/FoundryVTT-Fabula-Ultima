import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { BaseSkillDataModel } from './base-skill-data-model.mjs';
import { DamageTraits, SkillTraits, TraitUtils } from '../../../pipelines/traits.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} level.value
 * @property {number} level.min
 * @property {number} level.max
 * @property {string} class.value
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {String} accuracy A number or expression for the accuracy to be used.
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {ResourceDataModel} resource
 * @property {EffectApplicationDataModel} effects
 * @property {ImprovisedDamageDataModel} impdamage
 * @property {string} source.value
 * @property {boolean} hasRoll.value
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 */
export class SkillDataModel extends BaseSkillDataModel {
	static defineSchema() {
		const { SchemaField, StringField, NumberField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			level: new SchemaField({
				value: new NumberField({ initial: 1, min: 0, integer: true, nullable: false }),
				max: new NumberField({ initial: 10, min: 1, integer: true, nullable: false }),
				min: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			}),
			class: new SchemaField({ value: new StringField() }),
		});
	}

	shouldApplyEffect(effect) {
		return this.level.value > 0;
	}

	get attributePartials() {
		return [...this.commonPartials, ItemPartialTemplates.classField, ItemPartialTemplates.skillAttributes];
	}

	get retainedFieldPaths() {
		return ['level.value'];
	}

	/**
	 * @override
	 */
	getTags() {
		return [
			{ tag: 'FU.Class', separator: ':', value: this.class.value, show: this.class.value },
			{ tag: 'FU.SkillLevelAbbr', separator: ' ', value: this.level.value },
		];
	}

	get traitOptions() {
		return TraitUtils.getOptions({
			...DamageTraits,
			...SkillTraits,
		});
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	setSkillLevel(event, target) {
		let newLevel = Number(target.closest('[data-level]').dataset.level) || 0;
		if (event.type === 'contextmenu' || newLevel === this.level.value) {
			newLevel = Math.max(newLevel - 1, 0);
		}

		this.parent.update({
			'system.level.value': newLevel,
		});
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	updateSkillResource(event, target) {
		return this.parent.update({
			'system.rp': this.rp.getProgressUpdate(event, target, {
				indirect: {
					dataAttribute: 'data-resource-action',
					attributeValueIncrement: 'increment',
					attributeValueDecrement: 'decrement',
				},
			}),
		});
	}
}
