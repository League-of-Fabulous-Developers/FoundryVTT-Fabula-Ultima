import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { SkillMigrations } from './skill-migrations.mjs';
import { ExpressionContext } from '../../../expressions/expressions.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { TraitUtils } from '../../../pipelines/traits.mjs';
import { BaseSkillDataModel } from './base-skill-data-model.mjs';

const skillForAttributeCheck = 'skillForAttributeCheck';

/**
 * @type RenderCheckHook
 */
let onRenderAccuracyCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'accuracy' && item?.system instanceof SkillDataModel) {
		const inspector = CheckConfiguration.inspect(check);
		const weapon = fromUuidSync(inspector.getWeaponReference());

		if (check.critical) {
			CommonSections.opportunity(sections, item.system.opportunity, CHECK_DETAILS);
		}

		let tags = getTags(item);
		if (weapon) {
			if (weapon.system.getTags instanceof Function) {
				tags.push(...weapon.system.getTags(item.system.useWeapon.traits));
			}
		}
		CommonSections.tags(sections, tags, CHECK_DETAILS);
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);

		const targets = inspector.getTargets();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAccuracyCheck);

/**
 * @type RenderCheckHook
 */
let onRenderAttributeCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'attribute' && item?.system instanceof SkillDataModel && check.additionalData[skillForAttributeCheck]) {
		const skill = fromUuidSync(check.additionalData[skillForAttributeCheck]);
		const inspector = CheckConfiguration.inspect(check);
		CommonSections.itemFlavor(sections, skill);
		CommonSections.tags(sections, getTags(skill), CHECK_DETAILS);
		if (skill.system.hasResource.value) {
			CommonSections.resource(sections, skill.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, skill.system.description, skill.system.summary.value, CHECK_DETAILS);
		CommonSections.actions(sections, actor, item, [], flags, inspector);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAttributeCheck);

/**
 * @type RenderCheckHook
 */
const onRenderDisplay = (sections, check, actor, item, flags) => {
	if (check.type === 'display' && item?.system instanceof SkillDataModel) {
		CommonSections.tags(sections, getTags(item), CHECK_DETAILS);
		if (item.system.hasResource.value) {
			CommonSections.resource(sections, item.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
		// TODO: Find a better way to handle this, as it's needed when using a spell without accuracy
		if (!item.system.hasRoll.value) {
			CommonSections.actions(sections, actor, item, targets, flags, inspector);
		}
		CommonEvents.skill(actor, item);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderDisplay);

/**
 * @param {FUItem} skill
 * @return Tag[]
 */
function getTags(skill) {
	return [{ tag: 'FU.Class', separator: ':', value: skill.system.class.value, show: skill.system.class.value }, { tag: 'FU.SkillLevelAbbr', separator: ' ', value: skill.system.level.value }, ...TraitUtils.toTags(skill.system.traits)];
}

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
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.hasRoll.value) {
			if (this.useWeapon.accuracy) {
				return Checks.accuracyCheck(this.parent.actor, this.parent, this.#initializeAccuracyCheck(modifiers));
			} else {
				return Checks.attributeCheck(
					this.parent.actor,
					{
						primary: this.attributes.primary,
						secondary: this.attributes.secondary,
					},
					this.parent,
					this.#initializeAttributeCheck(modifiers),
				);
			}
		}
		return Checks.display(this.parent.actor, this.parent, this.#initializeSkillDisplay(modifiers));
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 * @remarks Expects a weapon
	 */
	#initializeSkillDisplay(modifiers) {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			await this.configureDisplayCheck(config, actor, item);
		};
	}

	/**
	 * @return {CheckCallback}
	 */
	#initializeAttributeCheck(modifiers) {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			await this.configureAttributeCheck(config, actor, item);
			check.additionalData[skillForAttributeCheck] = this.parent.uuid;
		};
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {CheckCallback}
	 * @remarks Expects a weapon
	 */
	#initializeAccuracyCheck(modifiers) {
		return async (check, actor, item) => {
			const weapon = await this.getWeapon(actor);
			/** @type WeaponDataModel **/
			const weaponData = weapon.system;
			const { check: weaponCheck, error } = await Checks.prepareCheckDryRun('accuracy', actor, weapon);
			if (error) {
				throw error;
			}

			check.primary = weaponCheck.primary;
			check.secondary = weaponCheck.secondary;

			/** @type SkillDataModel **/
			const skill = item.system;
			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);

			config.setWeapon(weapon);
			config.setHrZero(this.damage.hrZero || modifiers.shift);
			this.configureCheck(config);
			await this.addSkillDamage(config, item, context);

			// Weapon support
			if (skill.useWeapon.traits && weaponData.traits) {
				config.addTraitsFromItemModel(weaponData.traits);
			}
			if (skill.useWeapon.damage) {
				config.setDamage(this.damage.type || weaponData.damageType.value, weapon.system.damage.value);
			}
			if (skill.useWeapon.accuracy) {
				check.modifiers.push({
					label: 'FU.CheckBonus',
					value: weaponData.accuracy.value,
				});
			}
			config.setWeaponTraits(config.getWeaponTraits());
			await this.addSkillAccuracy(config, actor, item, context);
		};
	}

	shouldApplyEffect(effect) {
		return this.level.value > 0;
	}

	get attributePartials() {
		return [...this.commonPartials, ItemPartialTemplates.classField, ItemPartialTemplates.skillAttributes];
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
