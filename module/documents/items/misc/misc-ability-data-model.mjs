import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { MiscAbilityMigrations } from './misc-ability-migrations.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { BaseSkillDataModel } from '../skill/base-skill-data-model.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {string} opportunity
 * @property {UseWeaponDataModelV2} useWeapon
 * @property {ItemAttributesDataModelV2} attributes
 * @property {number} accuracy
 * @property {Defense} defense
 * @property {DamageDataModelV2} damage
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} hasClock.value
 * @property {boolean} hasResource.value
 * @property {ProgressDataModel} progress
 * @property {string} source.value
 * @property {boolean} isOffensive.value
 * @property {boolean} hasRoll.value
 * @property {EffectApplicationDataModel} effects
 * @property {ActionCostDataModel} cost
 * @property {TargetingDataModel} targeting
 * @property {Set<String>} traits
 */
export class MiscAbilityDataModel extends BaseSkillDataModel {
	static {
		deprecationNotice(this, 'rollInfo.useWeapon.accuracy.value', 'useWeapon.accuracy');
		deprecationNotice(this, 'rollInfo.useWeapon.damage.value', 'useWeapon.damage');
		deprecationNotice(this, 'rollInfo.useWeapon.hrZero.value', 'damage.hrZero');
		deprecationNotice(this, 'rollInfo.attributes.primary.value', 'attributes.primary');
		deprecationNotice(this, 'rollInfo.attributes.secondary.value', 'attributes.secondary');
		deprecationNotice(this, 'rollInfo.accuracy.value', 'accuracy');
		deprecationNotice(this, 'rollInfo.damage.hasDamage.value', 'damage.hasDamage');
		deprecationNotice(this, 'rollInfo.damage.value', 'damage.value');
		deprecationNotice(this, 'rollInfo.damage.type.value', 'damage.type');
		deprecationNotice(this, 'impdamage.hasImpDamage.value');
		deprecationNotice(this, 'impdamage.value');
		deprecationNotice(this, 'impdamage.impType.value');
		deprecationNotice(this, 'impdamage.type.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			opportunity: new StringField(),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			hasClock: new SchemaField({ value: new BooleanField() }),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source);
		MiscAbilityMigrations.run(source);
		return source;
	}

	getTags() {
		return super.getTags();
	}

	get attributePartials() {
		return [...this.commonPartials, ItemPartialTemplates.opportunityField, ItemPartialTemplates.behaviorField, ItemPartialTemplates.progressClock];
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	updateResource(event, target) {
		return this.parent.update({
			'system.rp': this.rp.getProgressUpdate(event, target, {
				indirect: {
					dataAttribute: 'data-resource-action',
					attributeValueIncrement: 'plus',
					attributeValueDecrement: 'minus',
				},
			}),
		});
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
