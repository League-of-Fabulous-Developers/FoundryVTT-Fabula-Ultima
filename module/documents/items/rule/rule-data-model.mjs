import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { StandardFields } from '../standard-fields.mjs';
import { SkillLikeItemHelper } from '../skill-like-item-helper.mjs';
import { DamageTraits, SkillTraits, TraitUtils } from '../../../pipelines/traits.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} source
 */
export class RuleDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			...StandardFields.traits(),
			...StandardFields.cost(),
			...StandardFields.hasRollAccuracyDefense(),
			...StandardFields.damage(),
			...StandardFields.effects(),
			...StandardFields.resource(),
			...StandardFields.resourcePoints(),
			...StandardFields.targeting(),
		});
	}

	get attributePartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.progressField,
			ItemPartialTemplates.behaviorField,
			StandardFields.traits,
			StandardFields.cost,
			StandardFields.hasRollAccuracyDefense,
			StandardFields.damage,
			StandardFields.effects,
			StandardFields.resource,
			StandardFields.resourcePoints,
			StandardFields.targeting,
		];
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

	get traitOptions() {
		return TraitUtils.getOptions({
			...DamageTraits,
			...SkillTraits,
		});
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return SkillLikeItemHelper.roll(this.parent, modifiers);
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	updateClock(event, target) {
		return this.parent.update({
			'system.progress': this.progress.getProgressUpdate(event, target, {
				direct: {
					dataAttribute: 'data-segment',
				},
				indirect: {
					dataAttribute: 'data-clock-action',
					attributeValueIncrement: 'fill',
					attributeValueDecrement: 'erase',
				},
			}),
		});
	}
}

SkillLikeItemHelper.registerSkillLikeType(RuleDataModel);
