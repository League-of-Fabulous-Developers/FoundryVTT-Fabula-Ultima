import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { MiscAbilityMigrations } from './misc-ability-migrations.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { ChooseWeaponDialog } from '../skill/choose-weapon-dialog.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { TraitUtils } from '../../../pipelines/traits.mjs';
import { BaseSkillDataModel } from '../skill/base-skill-data-model.mjs';
import { ExpressionContext } from '../../../expressions/expressions.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';

const skillForAttributeCheck = 'skillForAttributeCheck';

/**
 * @type RenderCheckHook
 */
let onRenderAccuracyCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'accuracy' && item?.system instanceof MiscAbilityDataModel) {
		const inspector = CheckConfiguration.inspect(check);
		const weapon = fromUuidSync(inspector.getWeaponReference());
		if (check.critical) {
			CommonSections.opportunity(sections, item.system.opportunity, CHECK_DETAILS);
		}
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		if (item.system.hasClock.value) {
			CommonSections.clock(sections, item.system.progress, CHECK_DETAILS);
		}

		// Tag info
		let tags = [];
		tags.push(...TraitUtils.toTags(item.system.traits));
		if (weapon) {
			if (weapon.system.getTags instanceof Function) {
				tags.push(...weapon.system.getTags(item.system.useWeapon.traits));
			}
		}
		CommonSections.tags(sections, tags, CHECK_DETAILS);
		const targets = CheckConfiguration.inspect(check).getTargetsOrDefault();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderAccuracyCheck);

/**
 * @type RenderCheckHook
 */
let onRenderAttributeCheck = (sections, check, actor, item, flags) => {
	if (check.type === 'attribute' && item?.system instanceof MiscAbilityDataModel && check.additionalData[skillForAttributeCheck]) {
		const inspector = CheckConfiguration.inspect(check);
		const ability = fromUuidSync(inspector.getWeaponReference());
		CommonSections.itemFlavor(sections, ability);
		if (check.critical) {
			CommonSections.opportunity(sections, ability.system.opportunity, CHECK_DETAILS);
		}
		CommonSections.description(sections, ability.system.description, ability.system.summary.value, CHECK_DETAILS, true);
		if (ability.system.hasClock.value) {
			CommonSections.clock(sections, item.system.progress, CHECK_DETAILS);
		}
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderAttributeCheck);

/**
 * @type RenderCheckHook
 */
const onRenderDisplay = (sections, check, actor, item, flags) => {
	if (check.type === 'display' && item?.system instanceof MiscAbilityDataModel) {
		const skill = item.system;
		CommonSections.tags(sections, skill.getCommonTags(), CHECK_DETAILS);
		if (item.system.hasResource.value) {
			CommonSections.resource(sections, item.system.rp, CHECK_DETAILS);
		}
		CommonSections.description(sections, item.system.description, item.system.summary.value, CHECK_DETAILS);
		const inspector = CheckConfiguration.inspect(check);
		const targets = inspector.getTargetsOrDefault();
		CommonSections.spendResource(sections, actor, item, item.system.cost, targets, flags);
		CommonSections.actions(sections, actor, item, targets, flags, inspector);
		CommonEvents.skill(actor, item);
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderDisplay);

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

	prepareBaseData() {
		if (!this.hasRoll.value) {
			this.useWeapon.accuracy = false;
			this.damage.hasDamage = false;
		}
		if (!this.useWeapon.accuracy) {
			this.damage.hasDamage = false;
		}
		if (!this.damage.hasDamage) {
			this.useWeapon.damage = false;
		}
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
					this.#initializeAttributeCheck(),
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
	#initializeAttributeCheck() {
		return async (check, actor, item) => {
			const config = CheckConfiguration.configure(check);
			await this.configureAttributeCheck(config, actor, item);
			config.setWeaponReference(this.parent);
		};
	}

	/**
	 * @param modifiers
	 * @return {CheckCallback}
	 */
	#initializeAccuracyCheck(modifiers) {
		return async (check, actor, item) => {
			const weapon = await ChooseWeaponDialog.prompt(actor, true);
			if (weapon === false) {
				let message = game.i18n.localize('FU.AbilityNoWeaponEquipped');
				ui.notifications.error(message);
				throw new Error(message);
			}
			if (weapon == null) {
				throw new Error('no selection');
			}
			const { check: weaponCheck, error } = await Checks.prepareCheckDryRun('accuracy', actor, weapon);
			if (error) {
				throw error;
			}

			check.primary = weaponCheck.primary;
			check.secondary = weaponCheck.secondary;

			const config = CheckConfiguration.configure(check);
			const targets = config.getTargets();
			const context = ExpressionContext.fromTargetData(actor, item, targets);
			config.setWeaponReference(weapon);
			this.configureCheck(config);
			await this.addSkillDamage(config, item, context);

			if (this.accuracy) {
				check.modifiers.push({
					label: 'FU.CheckBonus',
					value: this.accuracy,
				});
			}

			if (this.useWeapon.accuracy) {
				check.modifiers.push(...weaponCheck.modifiers.filter(({ label }) => label !== 'FU.AccuracyCheckBonusGeneric'));
			}
		};
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
